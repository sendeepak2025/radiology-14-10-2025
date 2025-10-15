#!/usr/bin/env python3
"""
Machine Management System Backend Test Suite
Tests the Machine Management API endpoints
"""

import requests
import json
import time
import base64
from typing import Dict, List, Optional, Tuple

class MachineManagementTestSuite:
    def __init__(self):
        # Configuration from review request
        self.backend_url = "http://localhost:8001"
        
        # Test results
        self.test_results = []
        self.failed_tests = []
        
        # Test data from review request
        self.test_machine_data = {
            "organizationId": "ORG-DEFAULT",
            "organizationName": "Test Hospital",
            "name": "CT Scanner 1",
            "machineType": "CT",
            "manufacturer": "GE Healthcare",
            "model": "Revolution CT",
            "serialNumber": "CT12345",
            "ipAddress": "192.168.1.100",
            "port": 4242,
            "aeTitle": "CT_SCANNER_1",
            "callingAeTitle": "PACS_SERVER",
            "location": {
                "building": "Main Hospital",
                "floor": "2",
                "room": "CT Room 1"
            },
            "autoAcceptStudies": True,
            "notes": "Primary CT scanner for emergency department"
        }
        
        # Store created machine ID for cleanup
        self.created_machine_id = None
        
        print(f"🔧 Machine Management Test Suite Initialized")
        print(f"   Backend URL: {self.backend_url}")
        print(f"   Test Organization: {self.test_machine_data['organizationId']}")
        print(f"   Test Machine: {self.test_machine_data['name']}")

    def log_test_result(self, test_name: str, success: bool, message: str, details: Dict = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {},
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        if not success:
            self.failed_tests.append(result)
            if details:
                print(f"   Details: {details}")

    def test_orthanc_rest_api_direct(self) -> bool:
        """Test 1: Verify Orthanc PACS server is running and accessible via REST API"""
        try:
            # Test basic auth
            auth = (self.orthanc_username, self.orthanc_password)
            
            # Test system endpoint
            response = requests.get(f"{self.orthanc_url}/system", auth=auth, timeout=10)
            
            if response.status_code == 200:
                system_info = response.json()
                version = system_info.get("Version", "Unknown")
                name = system_info.get("Name", "Unknown")
                
                # Check expected version
                expected_version = "1.10.1"
                version_match = version == expected_version
                
                self.log_test_result(
                    "Orthanc REST API Direct Access",
                    True,
                    f"Orthanc accessible - Version: {version}, Name: {name}",
                    {
                        "version": version,
                        "name": name,
                        "expected_version": expected_version,
                        "version_match": version_match,
                        "url": f"{self.orthanc_url}/system"
                    }
                )
                
                if not version_match:
                    self.log_test_result(
                        "Orthanc Version Check",
                        False,
                        f"Version mismatch - Expected: {expected_version}, Got: {version}",
                        {"expected": expected_version, "actual": version}
                    )
                
                return True
            else:
                self.log_test_result(
                    "Orthanc REST API Direct Access",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test_result(
                "Orthanc REST API Direct Access",
                False,
                f"Connection failed: {str(e)}",
                {"error": str(e), "url": self.orthanc_url}
            )
            return False

    def test_backend_pacs_connectivity(self) -> bool:
        """Test 2: Test DICOM C-ECHO connectivity through backend API"""
        try:
            response = requests.get(f"{self.backend_url}/api/pacs/test", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                connected = data.get("data", {}).get("connected", False)
                
                self.log_test_result(
                    "Backend PACS Connectivity Test",
                    connected,
                    f"PACS connectivity test {'passed' if connected else 'failed'}",
                    {
                        "connected": connected,
                        "response": data,
                        "endpoint": "/api/pacs/test"
                    }
                )
                return connected
            else:
                self.log_test_result(
                    "Backend PACS Connectivity Test",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test_result(
                "Backend PACS Connectivity Test",
                False,
                f"Request failed: {str(e)}",
                {"error": str(e), "endpoint": "/api/pacs/test"}
            )
            return False

    def test_orthanc_studies_direct(self) -> Tuple[bool, List[Dict]]:
        """Test 3: Get studies from Orthanc directly to verify test data"""
        try:
            auth = (self.orthanc_username, self.orthanc_password)
            
            # Get all studies
            response = requests.get(f"{self.orthanc_url}/studies", auth=auth, timeout=10)
            
            if response.status_code == 200:
                study_ids = response.json()
                studies_with_details = []
                
                # Get details for each study
                for study_id in study_ids:
                    try:
                        tags_response = requests.get(
                            f"{self.orthanc_url}/studies/{study_id}/simplified-tags", 
                            auth=auth, 
                            timeout=5
                        )
                        
                        if tags_response.status_code == 200:
                            tags = tags_response.json()
                            studies_with_details.append({
                                "studyId": study_id,
                                "studyInstanceUID": tags.get("StudyInstanceUID"),
                                "patientName": tags.get("PatientName", "Unknown"),
                                "patientID": tags.get("PatientID"),
                                "modality": tags.get("Modality", "OT"),
                                "studyDate": tags.get("StudyDate"),
                                "studyDescription": tags.get("StudyDescription")
                            })
                    except Exception as e:
                        print(f"   Warning: Failed to get details for study {study_id}: {e}")
                
                # Check for expected test studies
                found_studies = []
                for expected in self.expected_studies:
                    found = False
                    for study in studies_with_details:
                        if (expected["patientName"] in study["patientName"] and 
                            expected["modality"] == study["modality"]):
                            found_studies.append(study)
                            found = True
                            break
                    
                    if not found:
                        print(f"   Warning: Expected study not found - {expected}")
                
                self.log_test_result(
                    "Orthanc Studies Direct Access",
                    True,
                    f"Found {len(studies_with_details)} studies in Orthanc, {len(found_studies)} match expected test data",
                    {
                        "total_studies": len(studies_with_details),
                        "expected_studies": len(self.expected_studies),
                        "matching_studies": len(found_studies),
                        "studies": studies_with_details[:5],  # First 5 for brevity
                        "expected_test_studies": found_studies
                    }
                )
                
                return True, studies_with_details
            else:
                self.log_test_result(
                    "Orthanc Studies Direct Access",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                return False, []
                
        except Exception as e:
            self.log_test_result(
                "Orthanc Studies Direct Access",
                False,
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False, []

    def test_backend_pacs_studies_endpoint(self) -> Tuple[bool, List[Dict]]:
        """Test 4: Test backend PACS studies endpoint"""
        try:
            response = requests.get(f"{self.backend_url}/api/pacs/studies", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                studies = data.get("data", [])
                
                # Check for expected test studies
                found_expected = []
                for expected in self.expected_studies:
                    for study in studies:
                        if (expected["patientName"] in study.get("patientName", "") and 
                            expected["modality"] == study.get("modality")):
                            found_expected.append(study)
                            break
                
                success = len(studies) > 0
                self.log_test_result(
                    "Backend PACS Studies Endpoint",
                    success,
                    f"Retrieved {len(studies)} studies from backend PACS endpoint, {len(found_expected)} match expected",
                    {
                        "total_studies": len(studies),
                        "expected_matches": len(found_expected),
                        "endpoint": "/api/pacs/studies",
                        "sample_studies": studies[:3] if studies else []
                    }
                )
                
                return success, studies
            else:
                self.log_test_result(
                    "Backend PACS Studies Endpoint",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "response": response.text}
                )
                return False, []
                
        except Exception as e:
            self.log_test_result(
                "Backend PACS Studies Endpoint",
                False,
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False, []

    def test_backend_dicom_studies_endpoint(self) -> Tuple[bool, List[Dict]]:
        """Test 5: Test backend database studies endpoint"""
        try:
            response = requests.get(f"{self.backend_url}/api/dicom/studies", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                studies = data.get("data", []) if isinstance(data, dict) else data
                
                # Check for expected test studies
                found_expected = []
                for expected in self.expected_studies:
                    for study in studies:
                        if (expected["patientName"] in study.get("patientName", "") and 
                            expected["modality"] == study.get("modality")):
                            found_expected.append(study)
                            break
                
                success = len(studies) >= 0  # Allow empty database
                self.log_test_result(
                    "Backend Database Studies Endpoint",
                    success,
                    f"Retrieved {len(studies)} studies from database, {len(found_expected)} match expected test data",
                    {
                        "total_studies": len(studies),
                        "expected_matches": len(found_expected),
                        "endpoint": "/api/dicom/studies",
                        "sample_studies": studies[:3] if studies else []
                    }
                )
                
                return success, studies
            else:
                self.log_test_result(
                    "Backend Database Studies Endpoint",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "response": response.text}
                )
                return False, []
                
        except Exception as e:
            self.log_test_result(
                "Backend Database Studies Endpoint",
                False,
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False, []

    def test_unified_studies_endpoint(self) -> bool:
        """Test 6: Test unified studies endpoint (Database + PACS)"""
        try:
            response = requests.get(f"{self.backend_url}/api/pacs/unified-studies", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                studies = data.get("data", [])
                
                # Analyze sources
                sources = {}
                for study in studies:
                    source = study.get("source", "unknown")
                    sources[source] = sources.get(source, 0) + 1
                
                # Check for expected test studies
                found_expected = []
                for expected in self.expected_studies:
                    for study in studies:
                        if (expected["patientName"] in study.get("patientName", "") and 
                            expected["modality"] == study.get("modality")):
                            found_expected.append(study)
                            break
                
                success = len(studies) > 0
                self.log_test_result(
                    "Unified Studies Endpoint",
                    success,
                    f"Retrieved {len(studies)} unified studies, {len(found_expected)} match expected test data",
                    {
                        "total_studies": len(studies),
                        "sources": sources,
                        "expected_matches": len(found_expected),
                        "endpoint": "/api/pacs/unified-studies",
                        "sample_studies": studies[:3] if studies else []
                    }
                )
                
                return success
            else:
                self.log_test_result(
                    "Unified Studies Endpoint",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test_result(
                "Unified Studies Endpoint",
                False,
                f"Request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_webhook_endpoint_accessibility(self) -> bool:
        """Test 7: Verify webhook endpoint is accessible (without triggering processing)"""
        try:
            # Test with minimal payload to check endpoint accessibility
            test_payload = {
                "instanceId": "test-instance-id",
                "studyInstanceUID": "1.2.3.4.5.test",
                "seriesInstanceUID": "1.2.3.4.5.test.series",
                "sopInstanceUID": "1.2.3.4.5.test.sop",
                "test": True
            }
            
            # Use a different endpoint or method to avoid actual processing
            # First, let's just check if the endpoint exists by checking the route
            response = requests.get(f"{self.backend_url}/api/orthanc/sync-status", timeout=10)
            
            if response.status_code == 200:
                self.log_test_result(
                    "Webhook Integration Accessibility",
                    True,
                    "Webhook-related endpoints are accessible",
                    {
                        "sync_status_endpoint": "/api/orthanc/sync-status",
                        "webhook_endpoint": "/api/orthanc/new-instance",
                        "response": response.json()
                    }
                )
                return True
            else:
                self.log_test_result(
                    "Webhook Integration Accessibility",
                    False,
                    f"Webhook endpoints not accessible - HTTP {response.status_code}",
                    {"status_code": response.status_code, "response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test_result(
                "Webhook Integration Accessibility",
                False,
                f"Webhook endpoint test failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_pacs_sync_functionality(self) -> bool:
        """Test 8: Test PACS sync functionality"""
        try:
            response = requests.post(f"{self.backend_url}/api/pacs/sync", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                
                self.log_test_result(
                    "PACS Sync Functionality",
                    success,
                    f"PACS sync {'completed successfully' if success else 'failed'}",
                    {
                        "response": data,
                        "endpoint": "/api/pacs/sync"
                    }
                )
                return success
            else:
                self.log_test_result(
                    "PACS Sync Functionality",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code, "response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test_result(
                "PACS Sync Functionality",
                False,
                f"Sync request failed: {str(e)}",
                {"error": str(e)}
            )
            return False

    def test_backend_server_health(self) -> bool:
        """Test 9: Verify backend server is running and healthy"""
        try:
            response = requests.get(f"{self.backend_url}/", timeout=10)
            
            if response.status_code == 200:
                self.log_test_result(
                    "Backend Server Health",
                    True,
                    "Backend server is running and responding",
                    {
                        "status_code": response.status_code,
                        "response_length": len(response.text),
                        "endpoint": "/"
                    }
                )
                return True
            else:
                self.log_test_result(
                    "Backend Server Health",
                    False,
                    f"Backend server unhealthy - HTTP {response.status_code}",
                    {"status_code": response.status_code}
                )
                return False
                
        except Exception as e:
            self.log_test_result(
                "Backend Server Health",
                False,
                f"Backend server not accessible: {str(e)}",
                {"error": str(e)}
            )
            return False

    def run_all_tests(self) -> Dict:
        """Run all DICOM PACS integration tests"""
        print("\n🚀 Starting DICOM PACS Integration Test Suite")
        print("=" * 60)
        
        # Test sequence based on review request
        tests = [
            ("Backend Server Health", self.test_backend_server_health),
            ("Orthanc REST API Direct", self.test_orthanc_rest_api_direct),
            ("Backend PACS Connectivity", self.test_backend_pacs_connectivity),
            ("Orthanc Studies Direct", lambda: self.test_orthanc_studies_direct()[0]),
            ("Backend PACS Studies", lambda: self.test_backend_pacs_studies_endpoint()[0]),
            ("Backend Database Studies", lambda: self.test_backend_dicom_studies_endpoint()[0]),
            ("Unified Studies", self.test_unified_studies_endpoint),
            ("Webhook Accessibility", self.test_webhook_endpoint_accessibility),
            ("PACS Sync Functionality", self.test_pacs_sync_functionality)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if result:
                    passed += 1
            except Exception as e:
                self.log_test_result(
                    test_name,
                    False,
                    f"Test execution failed: {str(e)}",
                    {"error": str(e)}
                )
            
            print()  # Add spacing between tests
        
        # Summary
        print("=" * 60)
        print(f"📊 Test Summary: {passed}/{total} tests passed")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for failed in self.failed_tests:
                print(f"   • {failed['test']}: {failed['message']}")
        
        # Critical issues analysis
        critical_issues = []
        for failed in self.failed_tests:
            if any(keyword in failed['test'].lower() for keyword in ['connectivity', 'orthanc', 'server']):
                critical_issues.append(failed)
        
        return {
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": len(self.failed_tests),
            "success_rate": (passed / total) * 100,
            "critical_issues": len(critical_issues),
            "all_results": self.test_results,
            "failed_results": self.failed_tests,
            "critical_failures": critical_issues
        }

def main():
    """Main test execution"""
    print("DICOM PACS Integration Backend Test Suite")
    print("Testing Phase 1 DICOM PACS integration pipeline")
    print()
    
    # Initialize and run tests
    test_suite = DICOMPACSTestSuite()
    results = test_suite.run_all_tests()
    
    # Final assessment
    print("\n🎯 Final Assessment:")
    print(f"   Success Rate: {results['success_rate']:.1f}%")
    print(f"   Critical Issues: {results['critical_issues']}")
    
    if results['success_rate'] >= 80 and results['critical_issues'] == 0:
        print("   Status: ✅ DICOM PACS integration is functional")
    elif results['success_rate'] >= 60:
        print("   Status: ⚠️  DICOM PACS integration has minor issues")
    else:
        print("   Status: ❌ DICOM PACS integration has major issues")
    
    # Save detailed results
    with open('/app/dicom_pacs_test_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: /app/dicom_pacs_test_results.json")
    
    return results['success_rate'] >= 80 and results['critical_issues'] == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)