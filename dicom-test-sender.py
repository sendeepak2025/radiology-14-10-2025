#!/usr/bin/env python3
"""
DICOM Test Sender - Simulates CT/MRI/PET machines sending DICOM files
This script creates test DICOM images and sends them to Orthanc PACS
"""

import os
import sys
import time
from datetime import datetime
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid, ExplicitVRLittleEndian
from pynetdicom import AE, StoragePresentationContexts
import numpy as np

def create_test_dicom(patient_name="Test^Patient", modality="CT", 
                      study_description="Test Study", image_size=(512, 512)):
    """
    Create a test DICOM file with synthetic image data
    """
    print(f"Creating test DICOM: {patient_name}, {modality}")
    
    # Generate UIDs
    study_uid = generate_uid()
    series_uid = generate_uid()
    sop_uid = generate_uid()
    
    # Create file meta information
    file_meta = Dataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    file_meta.MediaStorageSOPInstanceUID = sop_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = generate_uid()
    
    # Create main dataset
    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    
    # Patient Information
    ds.PatientName = patient_name
    ds.PatientID = f"PID{int(time.time())}"
    ds.PatientBirthDate = "19800101"
    ds.PatientSex = "M"
    
    # Study Information
    ds.StudyInstanceUID = study_uid
    ds.StudyDate = datetime.now().strftime("%Y%m%d")
    ds.StudyTime = datetime.now().strftime("%H%M%S")
    ds.StudyDescription = study_description
    ds.AccessionNumber = f"ACC{int(time.time())}"
    
    # Series Information
    ds.SeriesInstanceUID = series_uid
    ds.SeriesNumber = 1
    ds.SeriesDescription = f"{modality} Series"
    ds.Modality = modality
    
    # Instance Information
    ds.SOPClassUID = '1.2.840.10008.5.1.4.1.1.2'
    ds.SOPInstanceUID = sop_uid
    ds.InstanceNumber = 1
    
    # Image Information
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.Rows = image_size[0]
    ds.Columns = image_size[1]
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    
    # Generate synthetic image data (gradient pattern)
    pixel_array = np.zeros(image_size, dtype=np.uint16)
    for i in range(image_size[0]):
        for j in range(image_size[1]):
            # Create a gradient + circular pattern
            distance_from_center = np.sqrt((i - image_size[0]//2)**2 + (j - image_size[1]//2)**2)
            pixel_value = int((i + j) % 4096 + (distance_from_center * 10) % 4096)
            pixel_array[i, j] = pixel_value
    
    ds.PixelData = pixel_array.tobytes()
    
    return ds

def send_dicom_to_orthanc(dataset, orthanc_host="127.0.0.1", orthanc_port=4242, 
                          orthanc_aet="ORTHANC", calling_aet="TEST_SENDER"):
    """
    Send DICOM dataset to Orthanc using C-STORE
    """
    print(f"\nSending DICOM to Orthanc...")
    print(f"  Orthanc: {orthanc_aet}@{orthanc_host}:{orthanc_port}")
    print(f"  Calling AET: {calling_aet}")
    
    # Create Application Entity
    ae = AE(ae_title=calling_aet)
    
    # Add all storage presentation contexts
    ae.requested_contexts = StoragePresentationContexts
    
    try:
        # Associate with Orthanc
        print(f"  Establishing DICOM association...")
        assoc = ae.associate(orthanc_host, orthanc_port, ae_title=orthanc_aet)
        
        if assoc.is_established:
            print(f"  ✓ Association established")
            
            # Send C-STORE
            print(f"  Sending C-STORE request...")
            status = assoc.send_c_store(dataset)
            
            # Check status
            if status:
                print(f"  ✓ C-STORE successful (Status: 0x{status.Status:04x})")
                print(f"  Patient: {dataset.PatientName}")
                print(f"  Study UID: {dataset.StudyInstanceUID}")
                print(f"  SOP Instance UID: {dataset.SOPInstanceUID}")
                success = True
            else:
                print(f"  ✗ C-STORE failed: Connection closed or invalid status")
                success = False
            
            # Release association
            assoc.release()
            print(f"  ✓ Association released")
            
            return success
        else:
            print(f"  ✗ Failed to establish association")
            print(f"  Reason: {assoc.rejected_reason if hasattr(assoc, 'rejected_reason') else 'Unknown'}")
            return False
            
    except Exception as e:
        print(f"  ✗ Error: {str(e)}")
        return False

def test_orthanc_echo(orthanc_host="127.0.0.1", orthanc_port=4242, 
                      orthanc_aet="ORTHANC", calling_aet="TEST_SENDER"):
    """
    Test DICOM connectivity using C-ECHO
    """
    print(f"\nTesting Orthanc connectivity (C-ECHO)...")
    print(f"  Target: {orthanc_aet}@{orthanc_host}:{orthanc_port}")
    
    from pynetdicom import AE, VerificationPresentationContexts
    
    ae = AE(ae_title=calling_aet)
    ae.requested_contexts = VerificationPresentationContexts
    
    try:
        assoc = ae.associate(orthanc_host, orthanc_port, ae_title=orthanc_aet)
        
        if assoc.is_established:
            # Send C-ECHO
            status = assoc.send_c_echo()
            assoc.release()
            
            if status:
                print(f"  ✓ C-ECHO successful - Orthanc is responding")
                return True
            else:
                print(f"  ✗ C-ECHO failed")
                return False
        else:
            print(f"  ✗ Failed to establish association")
            return False
            
    except Exception as e:
        print(f"  ✗ Error: {str(e)}")
        return False

def main():
    """
    Main function - Create and send test DICOM studies
    """
    print("=" * 70)
    print("DICOM Test Sender - Medical Imaging PACS Simulator")
    print("=" * 70)
    
    # Configuration
    ORTHANC_HOST = os.getenv("ORTHANC_HOST", "127.0.0.1")
    ORTHANC_PORT = int(os.getenv("ORTHANC_PORT", "4242"))
    ORTHANC_AET = os.getenv("ORTHANC_AET", "ORTHANC")
    CALLING_AET = "TEST_SENDER"
    
    # Test connectivity first
    if not test_orthanc_echo(ORTHANC_HOST, ORTHANC_PORT, ORTHANC_AET, CALLING_AET):
        print("\n✗ Cannot connect to Orthanc. Please check:")
        print("  1. Orthanc is running")
        print("  2. DICOM port 4242 is accessible")
        print("  3. AE Title is correct")
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("Creating and sending test DICOM studies...")
    print("=" * 70)
    
    # Test scenarios
    test_studies = [
        {
            "patient_name": "John^Doe",
            "modality": "CT",
            "study_description": "CT Chest with Contrast",
            "image_size": (512, 512)
        },
        {
            "patient_name": "Jane^Smith",
            "modality": "MR",
            "study_description": "MRI Brain",
            "image_size": (256, 256)
        },
        {
            "patient_name": "Bob^Wilson",
            "modality": "CR",
            "study_description": "Chest X-Ray",
            "image_size": (2048, 2048)
        }
    ]
    
    successful = 0
    failed = 0
    
    for i, study_config in enumerate(test_studies, 1):
        print(f"\n[{i}/{len(test_studies)}] " + "-" * 60)
        
        # Create DICOM
        dicom_dataset = create_test_dicom(**study_config)
        
        # Send to Orthanc
        if send_dicom_to_orthanc(dicom_dataset, ORTHANC_HOST, ORTHANC_PORT, 
                                 ORTHANC_AET, CALLING_AET):
            successful += 1
        else:
            failed += 1
        
        # Small delay between studies
        if i < len(test_studies):
            print(f"\n  Waiting 2 seconds before next study...")
            time.sleep(2)
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Total studies: {len(test_studies)}")
    print(f"  ✓ Successful: {successful}")
    print(f"  ✗ Failed: {failed}")
    
    if successful > 0:
        print(f"\n✓ Test DICOM studies sent successfully!")
        print(f"  Check your viewer at the frontend to see the studies")
        print(f"  Orthanc Explorer: http://localhost:8042/app/explorer.html")
    else:
        print(f"\n✗ All transmissions failed. Check Orthanc logs.")
    
    print("=" * 70)

if __name__ == "__main__":
    main()
