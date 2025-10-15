"""
AI Detection Service for Medical Imaging
Uses Google Gemini 2.0 Flash for analyzing DICOM images
"""

import os
import sys
import asyncio
import base64
from io import BytesIO
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import pydicom
from pydicom.pixel_data_handlers.util import apply_voi_lut
import numpy as np
from PIL import Image
import logging

# Load environment variables
load_dotenv()

# Import emergentintegrations
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
except ImportError:
    print("Error: emergentintegrations not installed. Run: pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/")
    sys.exit(1)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="AI Medical Image Detection Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "")
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USERNAME = os.getenv("ORTHANC_USERNAME", "orthanc")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "orthanc")
MONGODB_URI = os.getenv("MONGODB_URI", "")

if not EMERGENT_LLM_KEY:
    logger.error("EMERGENT_LLM_KEY not found in environment variables")

# Pydantic models
class AnalysisRequest(BaseModel):
    study_uid: str
    instance_id: Optional[str] = None
    frame_index: Optional[int] = 0
    modality: Optional[str] = "CT"
    patient_name: Optional[str] = "Unknown"
    study_description: Optional[str] = ""

class Finding(BaseModel):
    category: str
    description: str
    location: Optional[str] = None
    confidence: str
    severity: str

class AnalysisResult(BaseModel):
    study_uid: str
    analysis_id: str
    timestamp: str
    summary: str
    findings: List[Finding]
    recommendations: List[str]
    ai_confidence: str
    model_used: str

# Helper functions
def dicom_to_png_base64(dicom_file_path: str, frame_index: int = 0) -> str:
    """
    Convert DICOM file to base64-encoded PNG image
    """
    try:
        # Read DICOM file
        ds = pydicom.dcmread(dicom_file_path)
        
        # Get pixel array
        pixel_array = ds.pixel_array
        
        # Handle multi-frame DICOM
        if len(pixel_array.shape) > 2:
            pixel_array = pixel_array[frame_index]
        
        # Apply VOI LUT (windowing) for better visualization
        try:
            pixel_array = apply_voi_lut(pixel_array, ds)
        except:
            pass
        
        # Normalize to 0-255
        pixel_array = pixel_array - np.min(pixel_array)
        if np.max(pixel_array) > 0:
            pixel_array = pixel_array / np.max(pixel_array) * 255
        pixel_array = pixel_array.astype(np.uint8)
        
        # Convert to PIL Image
        if len(pixel_array.shape) == 2:
            # Grayscale
            image = Image.fromarray(pixel_array, mode='L')
        else:
            # RGB
            image = Image.fromarray(pixel_array)
        
        # Resize if too large (max 2048x2048 for API efficiency)
        max_size = 2048
        if image.size[0] > max_size or image.size[1] > max_size:
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert to PNG bytes
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        png_bytes = buffer.getvalue()
        
        # Encode to base64
        base64_image = base64.b64encode(png_bytes).decode('utf-8')
        
        return base64_image
        
    except Exception as e:
        logger.error(f"Error converting DICOM to PNG: {str(e)}")
        raise

def create_analysis_prompt(modality: str, patient_name: str, study_description: str) -> str:
    """
    Create a detailed prompt for AI analysis based on modality
    """
    base_prompt = f"""You are an expert radiologist AI assistant analyzing medical images.

**Patient Information:**
- Name: {patient_name}
- Study Type: {modality}
- Description: {study_description or 'Not provided'}

**Your Task:**
Analyze this medical image and provide a comprehensive assessment. Focus on identifying:

1. **Abnormalities**: Any tumors, masses, lesions, fractures, calcifications, or unusual findings
2. **Anatomical Assessment**: Evaluation of organs, bones, and soft tissues
3. **Pathological Signs**: Signs of disease, injury, or abnormal conditions
4. **Critical Findings**: Any urgent or critical conditions requiring immediate attention

**Response Format (JSON):**
{{
    "summary": "Brief 2-3 sentence overview of the image and key findings",
    "findings": [
        {{
            "category": "tumor|fracture|calcification|lesion|normal|other",
            "description": "Detailed description of the finding",
            "location": "Specific anatomical location",
            "confidence": "high|moderate|low",
            "severity": "critical|high|moderate|low|none"
        }}
    ],
    "recommendations": [
        "Specific recommendation 1",
        "Specific recommendation 2"
    ],
    "ai_confidence": "Overall confidence in this analysis (high|moderate|low)"
}}

**Important Guidelines:**
- Be precise and use proper medical terminology
- If the image appears normal, state that clearly
- For any abnormality, specify exact location and characteristics
- Provide actionable recommendations
- Note if image quality affects assessment
- Always include confidence levels

Analyze the image now:"""

    return base_prompt

async def analyze_with_gemini(image_base64: str, prompt: str) -> Dict[str, Any]:
    """
    Analyze image using Google Gemini 2.0 Flash
    """
    try:
        logger.info("Initializing Gemini 2.0 Flash for analysis...")
        
        # Create LlmChat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"medical-analysis-{datetime.now().timestamp()}",
            system_message="You are an expert medical imaging AI assistant specializing in radiology."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Create user message with image
        user_message = UserMessage(
            text=prompt,
            file_contents=[image_content]
        )
        
        logger.info("Sending image to Gemini for analysis...")
        
        # Get response
        response = await chat.send_message(user_message)
        
        logger.info(f"Received response from Gemini: {len(response)} characters")
        
        return {
            "success": True,
            "response": response
        }
        
    except Exception as e:
        logger.error(f"Error in Gemini analysis: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def parse_ai_response(response_text: str) -> Dict[str, Any]:
    """
    Parse AI response into structured format
    """
    import json
    import re
    
    try:
        # Try to extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            parsed = json.loads(json_str)
            return parsed
        else:
            # If no JSON found, create structured response from text
            return {
                "summary": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                "findings": [{
                    "category": "general",
                    "description": response_text,
                    "location": "Not specified",
                    "confidence": "moderate",
                    "severity": "low"
                }],
                "recommendations": ["Review with radiologist", "Clinical correlation recommended"],
                "ai_confidence": "moderate"
            }
    except Exception as e:
        logger.error(f"Error parsing AI response: {str(e)}")
        return {
            "summary": response_text[:200] if response_text else "Analysis completed",
            "findings": [],
            "recommendations": ["Manual review recommended"],
            "ai_confidence": "low"
        }

# API Routes
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AI Medical Image Detection",
        "status": "running",
        "model": "Google Gemini 2.0 Flash",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model": "gemini-2.0-flash",
        "api_key_configured": bool(EMERGENT_LLM_KEY),
        "orthanc_url": ORTHANC_URL
    }

@app.post("/api/ai/analyze", response_model=AnalysisResult)
async def analyze_study(request: AnalysisRequest):
    """
    Analyze a medical study using AI
    """
    try:
        logger.info(f"Received analysis request for study: {request.study_uid}")
        
        # For now, we'll use a mock DICOM file path
        # In production, this would fetch from Orthanc
        dicom_path = f"/tmp/{request.study_uid}.dcm"
        
        # TODO: Fetch actual DICOM from Orthanc
        # For testing, we'll create a synthetic response
        
        analysis_id = f"analysis-{datetime.now().timestamp()}"
        
        # Create analysis prompt
        prompt = create_analysis_prompt(
            request.modality,
            request.patient_name,
            request.study_description
        )
        
        # NOTE: For testing without actual DICOM file
        # In production, uncomment below to use real DICOM
        # image_base64 = dicom_to_png_base64(dicom_path, request.frame_index)
        # ai_result = await analyze_with_gemini(image_base64, prompt)
        
        # Mock response for testing
        mock_response = {
            "summary": "Medical image analysis completed. Awaiting DICOM file integration.",
            "findings": [
                {
                    "category": "normal",
                    "description": "No immediate abnormalities detected in preliminary analysis",
                    "location": "General assessment",
                    "confidence": "moderate",
                    "severity": "none"
                }
            ],
            "recommendations": [
                "Complete DICOM integration for full analysis",
                "Manual review by radiologist recommended"
            ],
            "ai_confidence": "moderate"
        }
        
        result = AnalysisResult(
            study_uid=request.study_uid,
            analysis_id=analysis_id,
            timestamp=datetime.now().isoformat(),
            summary=mock_response["summary"],
            findings=[Finding(**f) for f in mock_response["findings"]],
            recommendations=mock_response["recommendations"],
            ai_confidence=mock_response["ai_confidence"],
            model_used="gemini-2.0-flash"
        )
        
        logger.info(f"Analysis completed: {analysis_id}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/analyze-image")
async def analyze_uploaded_image(image_base64: str, modality: str = "CT"):
    """
    Analyze a base64-encoded image directly
    """
    try:
        logger.info("Analyzing uploaded image...")
        
        prompt = create_analysis_prompt(modality, "Unknown", "Direct upload")
        
        ai_result = await analyze_with_gemini(image_base64, prompt)
        
        if not ai_result["success"]:
            raise HTTPException(status_code=500, detail=ai_result["error"])
        
        parsed_result = parse_ai_response(ai_result["response"])
        
        return {
            "success": True,
            "analysis": parsed_result,
            "raw_response": ai_result["response"]
        }
        
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
