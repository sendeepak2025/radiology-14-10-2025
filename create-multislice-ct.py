#!/usr/bin/env python3
"""
Multi-Slice CT Study Generator
Creates a CT study with 100 slices and sends to Orthanc PACS for 3D rendering testing
"""

import os
import sys
import time
from datetime import datetime
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid, ExplicitVRLittleEndian, CTImageStorage
from pynetdicom import AE, StoragePresentationContexts
import numpy as np

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
    ds = Dataset()
    ds.file_meta = file_meta
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
    ds.StudyDescription = "CT Chest Multi-Slice for 3D Rendering"
    ds.StudyID = "CT3D001"
    
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
    # Simulate chest CT with varying density across slices
    center_y, center_x = image_size[0] // 2, image_size[1] // 2
    y, x = np.ogrid[:image_size[0], :image_size[1]]
    
    # Create a circular cross-section with varying intensity
    # Simulate lungs (darker) and surrounding tissue (brighter)
    radius = 150 + (slice_number / total_slices) * 50
    mask = ((x - center_x)**2 + (y - center_y)**2) <= radius**2
    
    # Base tissue (-500 HU for lung tissue)
    pixel_array = np.full(image_size, -500, dtype=np.int16)
    
    # Add variation to simulate anatomy
    # Inner circle: lung tissue (-800 to -600 HU)
    inner_radius = radius * 0.7
    inner_mask = ((x - center_x)**2 + (y - center_y)**2) <= inner_radius**2
    pixel_array[inner_mask] = -800 + np.random.randint(-50, 50, size=np.sum(inner_mask))
    
    # Outer ring: chest wall and ribs (0 to 200 HU)
    outer_mask = mask & ~inner_mask
    pixel_array[outer_mask] = 50 + np.random.randint(-50, 150, size=np.sum(outer_mask))
    
    # Add some high-density spots to simulate ribs/bones (300-1000 HU)
    num_ribs = 6
    for i in range(num_ribs):
        angle = (i / num_ribs) * 2 * np.pi
        rib_x = center_x + int(radius * 0.85 * np.cos(angle))
        rib_y = center_y + int(radius * 0.85 * np.sin(angle))
        rib_mask = ((x - rib_x)**2 + (y - rib_y)**2) <= 100
        pixel_array[rib_mask] = 500 + np.random.randint(-100, 300, size=np.sum(rib_mask))
    
    # Outside body: air (-1000 HU)
    pixel_array[~mask] = -1000
    
    ds.PixelData = pixel_array.tobytes()
    
    return ds

def send_dicom_to_orthanc(dicom_dataset, host, port, orthanc_aet, calling_aet):
    """
    Send a DICOM dataset to Orthanc PACS using DICOM C-STORE
    """
    try:
        # Create Application Entity
        ae = AE(ae_title=calling_aet)
        ae.requested_contexts = StoragePresentationContexts
        
        # Associate with Orthanc
        assoc = ae.associate(host, port, ae_title=orthanc_aet)
        
        if assoc.is_established:
            # Send C-STORE request
            status = assoc.send_c_store(dicom_dataset)
            
            # Release the association
            assoc.release()
            
            if status and status.Status == 0x0000:  # Success
                return True
            else:
                return False
        else:
            return False
            
    except Exception as e:
        print(f"    Error sending DICOM: {e}")
        return False

def main():
    print("=" * 80)
    print("Multi-Slice CT Study Generator for 3D Rendering")
    print("=" * 80)
    
    # Configuration
    ORTHANC_HOST = os.getenv("ORTHANC_HOST", "127.0.0.1")
    ORTHANC_PORT = int(os.getenv("ORTHANC_PORT", "4242"))
    ORTHANC_AET = os.getenv("ORTHANC_AET", "ORTHANC")
    CALLING_AET = "CT_SIMULATOR"
    
    NUM_SLICES = 100  # Create 100 slices for good 3D reconstruction
    IMAGE_SIZE = (512, 512)
    
    print(f"\nConfiguration:")
    print(f"  Orthanc Host: {ORTHANC_HOST}")
    print(f"  Orthanc Port: {ORTHANC_PORT}")
    print(f"  Orthanc AET: {ORTHANC_AET}")
    print(f"  Number of Slices: {NUM_SLICES}")
    print(f"  Image Size: {IMAGE_SIZE}")
    
    # Generate unique IDs for the study and series
    study_uid = generate_uid()
    series_uid = generate_uid()
    
    print(f"\n  Study UID: {study_uid}")
    print(f"  Series UID: {series_uid}")
    
    print("\n" + "=" * 80)
    print("Creating and sending CT slices...")
    print("=" * 80)
    
    successful = 0
    failed = 0
    
    for slice_num in range(1, NUM_SLICES + 1):
        # Create CT slice
        dicom_slice = create_ct_slice(
            study_uid=study_uid,
            series_uid=series_uid,
            slice_number=slice_num,
            total_slices=NUM_SLICES,
            image_size=IMAGE_SIZE
        )
        
        # Send to Orthanc
        if send_dicom_to_orthanc(dicom_slice, ORTHANC_HOST, ORTHANC_PORT, 
                                ORTHANC_AET, CALLING_AET):
            successful += 1
            if slice_num % 10 == 0:  # Progress every 10 slices
                print(f"  ✓ Sent slice {slice_num}/{NUM_SLICES}")
        else:
            failed += 1
            print(f"  ✗ Failed to send slice {slice_num}/{NUM_SLICES}")
        
        # Small delay to avoid overwhelming the server
        if slice_num % 10 == 0:
            time.sleep(0.5)
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"  Total slices created: {NUM_SLICES}")
    print(f"  ✓ Successfully sent: {successful}")
    print(f"  ✗ Failed: {failed}")
    
    if successful == NUM_SLICES:
        print("\n  🎉 SUCCESS! Multi-slice CT study created and sent to Orthanc!")
        print(f"  📊 Study UID: {study_uid}")
        print("\n  You can now:")
        print("    1. Open the Orthanc viewer (/orthanc)")
        print("    2. Find the study 'CT Chest Multi-Slice for 3D Rendering'")
        print("    3. Click 'Advanced' to open the viewer")
        print("    4. Click 'START 3D RENDERING' to see the 3D volume!")
    else:
        print(f"\n  ⚠️  WARNING: {failed} slices failed to send.")
        print("    The study may be incomplete for 3D rendering.")
    
    print("=" * 80)

if __name__ == "__main__":
    main()
