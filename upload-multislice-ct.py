#!/usr/bin/env python3
"""
Multi-Slice CT Study Uploader via REST API
Creates a CT study with 100 slices and uploads directly to the backend
"""

import os
import sys
import time
import json
import requests
from datetime import datetime
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid, ExplicitVRLittleEndian, CTImageStorage
import numpy as np
import tempfile

def create_ct_slice(study_uid, series_uid, slice_number, total_slices, 
                   patient_name="MultiSlice^CT^Patient", image_size=(512, 512)):
    """
    Create a single CT slice DICOM file
    """
    sop_uid = generate_uid()
    
    # Create file meta information
    file_meta = Dataset()
    file_meta.MediaStorageSOPClassUID = CTImageStorage
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = generate_uid()
    
    # Create main dataset
    ds = FileDataset("temp", {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    
    # Patient Information
    ds.PatientName = patient_name
    ds.PatientID = f"CT3D{int(time.time())}"
    ds.PatientBirthDate = "19750515"
    ds.PatientSex = "M"
    
    # Study Information
    ds.StudyInstanceUID = study_uid
    ds.StudyDate = datetime.now().strftime("%Y%m%d")
    ds.StudyTime = datetime.now().strftime("%H%M%S")
    ds.StudyDescription = "CT Chest Multi-Slice 3D"
    ds.StudyID = "CT3D001"
    ds.AccessionNumber = "ACC3D001"
    
    # Series Information
    ds.SeriesInstanceUID = series_uid
    ds.SeriesNumber = 1
    ds.SeriesDescription = "Chest CT Axial"
    ds.Modality = "CT"
    
    # Instance Information
    ds.SOPClassUID = CTImageStorage
    ds.SOPInstanceUID = sop_uid
    ds.InstanceNumber = slice_number
    
    # Image Information
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.Rows = image_size[0]
    ds.Columns = image_size[1]
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 1  # Signed
    
    # CT-specific tags
    ds.RescaleIntercept = -1024
    ds.RescaleSlope = 1
    ds.KVP = 120
    ds.SliceThickness = 2.0
    ds.SliceLocation = slice_number * 2.0  # 2mm spacing
    
    # Image Position (Patient) - for spatial reconstruction
    ds.ImagePositionPatient = [0, 0, slice_number * 2.0]
    ds.ImageOrientationPatient = [1, 0, 0, 0, 1, 0]
    ds.PixelSpacing = [0.7, 0.7]  # 0.7mm pixel spacing
    
    # Create synthetic CT image data with anatomical variation
    center_y, center_x = image_size[0] // 2, image_size[1] // 2
    y, x = np.ogrid[:image_size[0], :image_size[1]]
    
    # Create a circular cross-section with varying intensity
    radius = 150 + (slice_number / total_slices) * 50
    mask = ((x - center_x)**2 + (y - center_y)**2) <= radius**2
    
    # Base tissue
    pixel_array = np.full(image_size, -500, dtype=np.int16)
    
    # Inner circle: lung tissue
    inner_radius = radius * 0.7
    inner_mask = ((x - center_x)**2 + (y - center_y)**2) <= inner_radius**2
    pixel_array[inner_mask] = -800 + np.random.randint(-50, 50, size=np.sum(inner_mask))
    
    # Outer ring: chest wall
    outer_mask = mask & ~inner_mask
    pixel_array[outer_mask] = 50 + np.random.randint(-50, 150, size=np.sum(outer_mask))
    
    # Add ribs
    num_ribs = 6
    for i in range(num_ribs):
        angle = (i / num_ribs) * 2 * np.pi
        rib_x = center_x + int(radius * 0.85 * np.cos(angle))
        rib_y = center_y + int(radius * 0.85 * np.sin(angle))
        rib_mask = ((x - rib_x)**2 + (y - rib_y)**2) <= 100
        pixel_array[rib_mask] = 500 + np.random.randint(-100, 300, size=np.sum(rib_mask))
    
    # Outside body: air
    pixel_array[~mask] = -1000
    
    ds.PixelData = pixel_array.tobytes()
    
    return ds

def upload_dicom_to_backend(dicom_file_path, backend_url):
    """
    Upload DICOM file to backend via REST API
    """
    try:
        with open(dicom_file_path, 'rb') as f:
            files = {'file': ('slice.dcm', f, 'application/dicom')}
            response = requests.post(f"{backend_url}/api/dicom/upload", files=files, timeout=30)
            return response.status_code == 200
    except Exception as e:
        print(f"    Error: {e}")
        return False

def main():
    print("=" * 80)
    print("Multi-Slice CT Study Generator via REST API")
    print("=" * 80)
    
    # Configuration
    BACKEND_URL = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")
    NUM_SLICES = 100
    IMAGE_SIZE = (512, 512)
    
    print(f"\nConfiguration:")
    print(f"  Backend URL: {BACKEND_URL}")
    print(f"  Number of Slices: {NUM_SLICES}")
    print(f"  Image Size: {IMAGE_SIZE}")
    
    # Generate unique IDs
    study_uid = generate_uid()
    series_uid = generate_uid()
    
    print(f"\n  Study UID: {study_uid}")
    print(f"  Series UID: {series_uid}")
    
    print("\n" + "=" * 80)
    print("Creating and uploading CT slices...")
    print("=" * 80)
    
    successful = 0
    failed = 0
    
    # Create temporary directory for DICOM files
    with tempfile.TemporaryDirectory() as tmpdir:
        for slice_num in range(1, NUM_SLICES + 1):
            # Create CT slice
            dicom_slice = create_ct_slice(
                study_uid=study_uid,
                series_uid=series_uid,
                slice_number=slice_num,
                total_slices=NUM_SLICES,
                image_size=IMAGE_SIZE
            )
            
            # Save to temporary file
            temp_file = os.path.join(tmpdir, f"slice_{slice_num:03d}.dcm")
            dicom_slice.save_as(temp_file)
            
            # Upload to backend
            if upload_dicom_to_backend(temp_file, BACKEND_URL):
                successful += 1
                if slice_num % 10 == 0:
                    print(f"  ✓ Uploaded slice {slice_num}/{NUM_SLICES}")
            else:
                failed += 1
                if slice_num % 10 == 0:
                    print(f"  ✗ Failed slice {slice_num}/{NUM_SLICES}")
            
            # Small delay
            if slice_num % 20 == 0:
                time.sleep(1)
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"  Total slices created: {NUM_SLICES}")
    print(f"  ✓ Successfully uploaded: {successful}")
    print(f"  ✗ Failed: {failed}")
    
    if successful >= NUM_SLICES * 0.9:  # 90% success rate
        print("\n  🎉 SUCCESS! Multi-slice CT study uploaded!")
        print(f"  📊 Study UID: {study_uid}")
        print("\n  You can now:")
        print("    1. Open the Orthanc viewer (/orthanc)")
        print("    2. Find the study 'CT Chest Multi-Slice 3D'")
        print("    3. Click 'Advanced' to open the viewer")
        print("    4. Click 'START 3D RENDERING' to see the 3D volume!")
    else:
        print(f"\n  ⚠️  WARNING: {failed} slices failed to upload.")
    
    print("=" * 80)

if __name__ == "__main__":
    main()
