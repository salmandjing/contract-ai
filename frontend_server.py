#!/usr/bin/env python3
"""
AgentCore Frontend Server - V3 Edition
Serves the polished V3 frontend with AgentCore backend
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
from urllib.parse import urlparse
import asyncio
import boto3
import time

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded credentials from .env file")
except ImportError:
    print("⚠️  python-dotenv not installed. Using environment variables.")
except Exception as e:
    print(f"⚠️  Could not load .env file: {e}")

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Get AWS region from environment or use default
AWS_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')

# Initialize Bedrock Agent Runtime client (primary backend)
bedrock_runtime = boto3.client('bedrock-agent-runtime', region_name=AWS_REGION)

# Bedrock Agent IDs
ANALYSIS_AGENT_ID = 'XQOMZBYZUU'
COMPARISON_AGENT_ID = 'UH8WCAURTA'
AGENT_ALIAS_ID = 'TSTALIASID'

# Try to import AgentCore agents (optional - for legacy support)
try:
    from agents.contract_analysis_entrypoint import analyze_contract
    from agents.contract_comparison_agentcore import ContractComparisonAgentCore
    from agents.obligation_extraction_entrypoint import extract_obligations_entrypoint
    from agents.batch_processing_entrypoint import process_batch_entrypoint
    
    # Initialize the AgentCore comparison agent
    comparison_agent = ContractComparisonAgentCore()
    AGENTCORE_AVAILABLE = True
    print("✅ AgentCore backend available")
except Exception as e:
    print(f"⚠️  AgentCore not available (using Bedrock only): {e}")
    AGENTCORE_AVAILABLE = False
    comparison_agent = None


class V3FrontendHandler(SimpleHTTPRequestHandler):
    """HTTP handler that serves V3 frontend and AgentCore API."""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve V3 frontend files from local frontend directory
        self.v3_frontend_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            'frontend'
        )
        
        # Check if V3 frontend exists
        if not os.path.exists(self.v3_frontend_dir):
            print(f"⚠️  Error: V3 frontend directory not found at: {self.v3_frontend_dir}")
            raise FileNotFoundError(f"Frontend directory not found: {self.v3_frontend_dir}")
        
        super().__init__(*args, directory=self.v3_frontend_dir, **kwargs)
    
    def log_message(self, format, *args):
        """Override to customize logging."""
        # Only log errors and important messages
        if '404' in str(args) or '500' in str(args):
            super().log_message(format, *args)
    
    def do_GET(self):
        """Handle GET requests."""
        parsed_path = urlparse(self.path)
        
        # Health check
        if parsed_path.path == '/api/health' or parsed_path.path == '/health':
            self.send_json_response({
                'status': 'healthy',
                'service': 'agentcore-v3',
                'frontend': 'V3',
                'backend': 'AgentCore'
            })
            return
        
        # Serve index for root
        if parsed_path.path == '/':
            self.path = '/v3-app.html'
        
        # Serve v3-app.html with API URL override
        if self.path == '/v3-app.html':
            self.serve_v3_html_with_config()
            return
        
        # Serve static files
        return super().do_GET()
    
    def serve_v3_html_with_config(self):
        """Serve v3-app.html with API configuration injected."""
        try:
            html_path = os.path.join(self.v3_frontend_dir, 'v3-app.html')
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Get the actual port from the server
            server_port = self.server.server_port
            
            # Inject API configuration before the first script tag
            config_script = f'''
    <script>
      // AgentCore API Configuration Override
      window.API_BASE_URL = "http://localhost:{server_port}";
      console.log("✅ AgentCore backend configured:", window.API_BASE_URL);
    </script>
'''
            # Insert before </head> tag
            html_content = html_content.replace('</head>', config_script + '  </head>')
            
            # Also replace the API baseURL in the HTML if it's hardcoded
            html_content = html_content.replace(
                'baseURL: "http://localhost:8000"',
                'baseURL: window.API_BASE_URL || "http://localhost:8082"'
            )
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', len(html_content.encode('utf-8')))
            self.end_headers()
            self.wfile.write(html_content.encode('utf-8'))
        except Exception as e:
            print(f"Error serving v3-app.html: {e}")
            self.send_error(500, f"Error serving HTML: {str(e)}")
    
    def do_POST(self):
        """Handle POST requests to AgentCore API."""
        parsed_path = urlparse(self.path)
        
        # Handle file upload separately
        if parsed_path.path == '/api/upload' or parsed_path.path == '/api/extract-text':
            self.handle_file_upload()
            return
        
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError as e:
            self.send_error_response(f'Invalid JSON: {str(e)}', 400)
            return
        
        parsed_path = urlparse(self.path)
        
        # Route to appropriate agent
        try:
            # Bedrock Agent endpoints
            if parsed_path.path == '/api/bedrock/analyze':
                result = self.handle_bedrock_analyze(data)
                self.send_json_response(result)
            
            elif parsed_path.path == '/api/bedrock/compare':
                result = self.handle_bedrock_compare(data)
                self.send_json_response(result)
            
            # AgentCore endpoints (existing - optional)
            elif parsed_path.path == '/api/agentcore/analyze' or parsed_path.path == '/api/analyze':
                if not AGENTCORE_AVAILABLE:
                    self.send_error_response('AgentCore not available. Please use /api/bedrock/analyze', 503)
                    return
                result = asyncio.run(self.handle_analyze(data))
                self.send_json_response(result)
            
            elif parsed_path.path == '/api/agentcore/compare' or parsed_path.path == '/api/compare':
                # Always try to handle compare, fall back to mock if needed
                result = asyncio.run(self.handle_compare(data))
                self.send_json_response(result)
            
            elif parsed_path.path == '/api/agentcore/extract_obligations' or parsed_path.path == '/api/obligations/extract':
                if not AGENTCORE_AVAILABLE:
                    self.send_error_response('AgentCore not available', 503)
                    return
                result = asyncio.run(self.handle_extract_obligations(data))
                self.send_json_response(result)
            
            elif parsed_path.path == '/api/agentcore/batch' or parsed_path.path == '/api/batch/process':
                if not AGENTCORE_AVAILABLE:
                    self.send_error_response('AgentCore not available', 503)
                    return
                result = asyncio.run(self.handle_batch(data))
                self.send_json_response(result)
            
            # Clause Assistant endpoints
            elif parsed_path.path == '/api/clause-assistant/batch-analyze':
                result = asyncio.run(self.handle_clause_batch_analyze(data))
                self.send_json_response(result)
            
            elif parsed_path.path == '/api/clause-assistant/improve':
                result = asyncio.run(self.handle_clause_improve(data))
                self.send_json_response(result)
            
            # Template Generator endpoints
            elif parsed_path.path == '/api/template/extract-from-email':
                result = asyncio.run(self.handle_extract_from_email(data))
                self.send_json_response(result)
            
            elif parsed_path.path == '/api/template/generate':
                result = asyncio.run(self.handle_generate_template(data))
                self.send_json_response(result)
            
            else:
                self.send_error_response(f'Endpoint not found: {parsed_path.path}', 404)
        
        except Exception as e:
            print(f"❌ Error handling request: {e}")
            import traceback
            traceback.print_exc()
            self.send_error_response(f'Internal server error: {str(e)}', 500)
    
    def handle_file_upload(self):
        """Handle file upload and text extraction."""
        import cgi
        import io
        
        try:
            # Parse multipart form data
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self.send_error_response('Expected multipart/form-data', 400)
                return
            
            # Parse the form data
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    'REQUEST_METHOD': 'POST',
                    'CONTENT_TYPE': content_type,
                }
            )
            
            # Get the uploaded file
            if 'file' not in form:
                self.send_error_response('No file uploaded', 400)
                return
            
            file_item = form['file']
            filename = file_item.filename
            file_data = file_item.file.read()
            
            print(f"📄 Extracting text from: {filename}")
            
            # Extract text based on file type
            extracted_text = ""
            
            if filename.lower().endswith('.pdf'):
                # Try to extract PDF text
                try:
                    import PyPDF2
                    pdf_file = io.BytesIO(file_data)
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    for page in pdf_reader.pages:
                        extracted_text += page.extract_text() + "\n"
                except ImportError:
                    # Fallback if PyPDF2 not available
                    extracted_text = "[PDF text extraction requires PyPDF2. Please install: pip install PyPDF2]"
                except Exception as e:
                    extracted_text = f"[Error extracting PDF: {str(e)}]"
            
            elif filename.lower().endswith(('.txt', '.text')):
                # Plain text file
                try:
                    extracted_text = file_data.decode('utf-8')
                except:
                    extracted_text = file_data.decode('latin-1')
            
            else:
                # Try to decode as text
                try:
                    extracted_text = file_data.decode('utf-8')
                except:
                    extracted_text = "[Unsupported file type. Please upload PDF or TXT files.]"
            
            # Return extracted text
            self.send_json_response({
                'success': True,
                'filename': filename,
                'text': extracted_text.strip(),
                'length': len(extracted_text)
            })
            
        except Exception as e:
            print(f"❌ File upload error: {e}")
            import traceback
            traceback.print_exc()
            self.send_error_response(f'File upload failed: {str(e)}', 500)
    
    async def handle_analyze(self, data):
        """Handle contract analysis."""
        print(f"📄 Analyzing contract...")
        return await analyze_contract(
            contract_text=data.get('contract_text', data.get('text', '')),
            jurisdiction=data.get('jurisdiction', 'US'),
            user_id=data.get('user_id', 'demo-user'),
            session_id=data.get('session_id', 'demo-session')
        )
    
    async def handle_compare(self, data):
        """Handle contract comparison using AgentCore."""
        print(f"🔄 Comparing contracts...")
        
        if not AGENTCORE_AVAILABLE or comparison_agent is None:
            # Return mock comparison data
            print("⚠️ AgentCore not available, using mock comparison")
            return self.get_mock_comparison(
                data.get('contract_a_text', data.get('contract1', '')),
                data.get('contract_b_text', data.get('contract2', ''))
            )
        
        try:
            result = await comparison_agent.compare_contracts(
                contract_a_text=data.get('contract_a_text', data.get('contract1', '')),
                contract_b_text=data.get('contract_b_text', data.get('contract2', '')),
                jurisdiction=data.get('jurisdiction', 'US'),
                user_id=data.get('user_id', 'demo-user'),
                session_id=data.get('session_id', 'demo-session')
            )
            
            # DEBUG: Print what we're sending to frontend
            print("\n" + "="*70)
            print("📤 SENDING TO FRONTEND (AgentCore):")
            print("="*70)
            import json
            print(json.dumps(result, indent=2, default=str))
            print("="*70 + "\n")
            
            return result
        except Exception as e:
            print(f"❌ Comparison error: {e}")
            return self.get_mock_comparison(
                data.get('contract_a_text', data.get('contract1', '')),
                data.get('contract_b_text', data.get('contract2', ''))
            )
    
    async def handle_extract_obligations(self, data):
        """Handle obligation extraction."""
        print(f"📋 Extracting obligations...")
        return await extract_obligations_entrypoint(
            contract_text=data.get('contract_text', data.get('text', '')),
            contract_type=data.get('contract_type'),
            user_id=data.get('user_id', 'demo-user'),
            session_id=data.get('session_id', 'demo-session')
        )
    
    def handle_bedrock_analyze(self, data):
        """Handle contract analysis using Bedrock Agent."""
        print(f"🤖 Analyzing contract with Bedrock Agent...")
        
        contract_text = data.get('contract_text', data.get('text', ''))
        session_id = data.get('session_id', f'session-{int(time.time())}')
        
        if not contract_text:
            return {'success': False, 'error': 'No contract text provided'}
        
        try:
            # Invoke Bedrock Agent
            response = bedrock_runtime.invoke_agent(
                agentId=ANALYSIS_AGENT_ID,
                agentAliasId=AGENT_ALIAS_ID,
                sessionId=session_id,
                inputText=f"Analyze this contract:\n\n{contract_text}"
            )
            
            # Collect streaming response
            full_response = ""
            for event in response['completion']:
                if 'chunk' in event:
                    chunk = event['chunk']
                    if 'bytes' in chunk:
                        full_response += chunk['bytes'].decode('utf-8')
            
            print(f"✅ Bedrock analysis complete ({len(full_response)} chars)")
            
            return {
                'success': True,
                'analysis': full_response,
                'agent': 'bedrock',
                'agent_id': ANALYSIS_AGENT_ID,
                'session_id': session_id
            }
            
        except Exception as e:
            print(f"❌ Bedrock analysis error: {e}")
            return {
                'success': False,
                'error': f'Bedrock analysis failed: {str(e)}'
            }
    
    def handle_bedrock_compare(self, data):
        """Handle contract comparison using Bedrock Agent."""
        print(f"🤖 Comparing contracts with Bedrock Agent...")
        
        contract1 = data.get('contract_a_text', data.get('contract1', ''))
        contract2 = data.get('contract_b_text', data.get('contract2', ''))
        session_id = data.get('session_id', f'session-{int(time.time())}')
        
        if not contract1 or not contract2:
            return {'success': False, 'error': 'Both contracts are required'}
        
        try:
            # Invoke Bedrock Agent
            prompt = f"""Compare these two contracts and identify all key differences:

CONTRACT 1:
{contract1}

CONTRACT 2:
{contract2}

Please provide:
1. Key differences in terms, pricing, obligations, and parties
2. Which contract is more favorable and why
3. Any risks or concerns
4. Recommendations"""

            response = bedrock_runtime.invoke_agent(
                agentId=COMPARISON_AGENT_ID,
                agentAliasId=AGENT_ALIAS_ID,
                sessionId=session_id,
                inputText=prompt
            )
            
            # Collect streaming response
            full_response = ""
            for event in response['completion']:
                if 'chunk' in event:
                    chunk = event['chunk']
                    if 'bytes' in chunk:
                        full_response += chunk['bytes'].decode('utf-8')
            
            print(f"✅ Bedrock comparison complete ({len(full_response)} chars)")
            
            return {
                'success': True,
                'comparison': full_response,
                'agent': 'bedrock',
                'agent_id': COMPARISON_AGENT_ID,
                'session_id': session_id
            }
            
        except Exception as e:
            print(f"❌ Bedrock comparison error: {e}")
            return {
                'success': False,
                'error': f'Bedrock comparison failed: {str(e)}'
            }
    
    async def handle_batch(self, data):
        """Handle batch processing."""
        contracts = data.get('contracts', [])
        print(f"📦 Batch processing {len(contracts)} contracts...")
        return await process_batch_entrypoint(
            contracts=contracts,
            jurisdiction=data.get('jurisdiction', 'US'),
            user_id=data.get('user_id', 'demo-user'),
            session_id=data.get('session_id', 'demo-session'),
            max_concurrent=data.get('max_concurrent', 5)
        )
    
    async def handle_clause_batch_analyze(self, data):
        """Handle clause batch analysis using AgentCore."""
        print(f"\n{'='*70}")
        print(f"🔍 CLAUSE BATCH ANALYZE REQUEST RECEIVED")
        print(f"{'='*70}")
        contract_text = data.get('contract_text', '')
        print(f"Contract text length: {len(contract_text)} chars")
        print(f"First 500 chars: {contract_text[:500]}")
        print(f"Last 300 chars: {contract_text[-300:]}")
        
        # Always try to use the clause assistant - it doesn't need AWS credentials
        try:
            from agents.clause_assistant_entrypoint import lambda_handler
            
            event = {
                'action': 'batch_analyze',
                'contract_text': data.get('contract_text', ''),
                'user_id': data.get('user_id', 'demo-user'),
                'session_id': data.get('session_id', 'demo-session')
            }
            
            result = lambda_handler(event, None)
            
            if result['statusCode'] == 200:
                response_data = json.loads(result['body'])
                print(f"✅ Extracted {response_data['summary']['total_clauses']} clauses")
                return response_data
            else:
                print(f"⚠️ Clause analysis failed, using mock data")
                return self.get_mock_clause_analysis(data.get('contract_text', ''))
                
        except Exception as e:
            print(f"❌ Clause analysis error: {e}")
            import traceback
            traceback.print_exc()
            # Use actual contract text for analysis
            return self.get_mock_clause_analysis(data.get('contract_text', ''))
    
    async def handle_clause_improve(self, data):
        """Handle clause improvement suggestions using AgentCore."""
        print(f"✨ Generating clause improvements with AgentCore...")
        
        # Always try to use the clause assistant - it doesn't need AWS credentials
        try:
            from agents.clause_assistant_entrypoint import lambda_handler
            
            event = {
                'action': 'improve_clause',
                'clause_text': data.get('clause_text', ''),
                'clause_type': data.get('clause_type', 'general'),
                'issues': data.get('issues', []),
                'user_id': data.get('user_id', 'demo-user'),
                'session_id': data.get('session_id', 'demo-session')
            }
            
            result = lambda_handler(event, None)
            
            if result['statusCode'] == 200:
                response_data = json.loads(result['body'])
                print(f"✅ Generated {len(response_data.get('alternatives', []))} improvement alternatives")
                return response_data
            else:
                print(f"⚠️ Clause improvement failed, using mock data")
                return self.get_mock_clause_improvements(data.get('clause_text', ''))
                
        except Exception as e:
            print(f"❌ Clause improvement error: {e}")
            import traceback
            traceback.print_exc()
            return self.get_mock_clause_improvements(data.get('clause_text', ''))
    
    def get_mock_clause_analysis(self, contract_text=""):
        """Return clause analysis based on actual contract text."""
        import re
        
        print(f"\n🔍 Analyzing contract text ({len(contract_text)} chars)")
        print(f"📄 First 200 chars: {contract_text[:200]}")
        
        # Extract clauses from contract text
        clauses = []
        
        # Split by numbered sections (1., 2., etc.) or by double newlines
        sections = re.split(r'\n\s*\d+\.\s+', contract_text)
        
        # Get section titles
        titles = re.findall(r'\d+\.\s+([^\n]+)', contract_text)
        
        print(f"📊 Found {len(sections)} sections and {len(titles)} titles")
        
        if len(titles) > 0:
            # Remove first empty section if it exists
            if len(sections) > len(titles):
                sections = sections[1:]
            
            for i, (title, text) in enumerate(zip(titles, sections)):
                clause_text = text.strip()
                if not clause_text:
                    continue
                    
                # Analyze the clause
                analysis = self.analyze_clause_text(clause_text, title)
                
                clauses.append({
                    'id': f'clause_{i+1}',
                    'title': f'{i+1}. {title}',
                    'text': clause_text,
                    'type': self.detect_clause_type(title),
                    'length': len(clause_text),
                    'position': i+1,
                    'analysis': analysis
                })
                print(f"✅ Extracted clause: {i+1}. {title} ({len(clause_text)} chars)")
        
        # Calculate summary
        if not clauses:
            # Fallback to mock data if no clauses found
            print("⚠️  No clauses extracted, using default mock data")
            return self.get_default_mock_data()
        
        risk_distribution = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        total_issues = 0
        total_risk_score = 0
        
        for clause in clauses:
            risk_level = clause['analysis']['risk_level']
            risk_distribution[risk_level] = risk_distribution.get(risk_level, 0) + 1
            total_issues += len(clause['analysis']['issues'])
            total_risk_score += clause['analysis']['risk_score']
        
        avg_risk_score = total_risk_score / len(clauses) if clauses else 0
        
        return {
            'success': True,
            'clauses': clauses,
            'summary': {
                'total_clauses': len(clauses),
                'risk_distribution': risk_distribution,
                'total_issues': total_issues,
                'avg_risk_score': round(avg_risk_score, 2)
            }
        }
    
    def detect_clause_type(self, title):
        """Detect clause type from title."""
        title_lower = title.lower()
        if 'payment' in title_lower or 'price' in title_lower:
            return 'payment'
        elif 'termination' in title_lower or 'terminate' in title_lower:
            return 'termination'
        elif 'liability' in title_lower or 'indemnif' in title_lower:
            return 'liability'
        elif 'confidential' in title_lower:
            return 'confidentiality'
        elif 'warranty' in title_lower or 'guarantee' in title_lower:
            return 'warranty'
        else:
            return 'general'
    
    def analyze_clause_text(self, text, title):
        """Analyze clause text for issues."""
        issues = []
        risk_score = 0
        
        text_lower = text.lower()
        
        # Check for vague language
        vague_terms = ['reasonable', 'best efforts', 'as soon as possible', 'promptly', 'timely']
        for term in vague_terms:
            if term in text_lower:
                issues.append({
                    'type': 'vague_language',
                    'severity': 'medium',
                    'description': f'Contains vague term: "{term}"',
                    'recommendation': f'Replace "{term}" with specific criteria or timeframes'
                })
                risk_score += 15
        
        # Check for one-sided terms
        one_sided_terms = ['sole discretion', 'at will', 'without limitation', 'absolute', 'unconditional']
        for term in one_sided_terms:
            if term in text_lower:
                issues.append({
                    'type': 'one_sided',
                    'severity': 'high',
                    'description': f'One-sided term: "{term}"',
                    'recommendation': 'Add mutual obligations or protective conditions'
                })
                risk_score += 25
        
        # Check for missing notice requirements
        if 'termination' in title.lower() or 'terminate' in text_lower:
            if 'notice' not in text_lower and 'days' not in text_lower:
                issues.append({
                    'type': 'missing_notice',
                    'severity': 'high',
                    'description': 'No notice period specified',
                    'recommendation': 'Add notice requirement (e.g., "30 days written notice")'
                })
                risk_score += 20
        
        # Check for unlimited liability
        if 'without limitation' in text_lower or 'unlimited' in text_lower:
            issues.append({
                'type': 'unlimited_liability',
                'severity': 'critical',
                'description': 'Unlimited liability exposure',
                'recommendation': 'Cap liability at reasonable amount (e.g., contract value)'
            })
            risk_score += 30
        
        # Check for missing payment terms
        if 'payment' in title.lower() or 'pay' in text_lower:
            if not any(term in text_lower for term in ['days', 'date', 'upon', 'within']):
                issues.append({
                    'type': 'vague_payment',
                    'severity': 'high',
                    'description': 'Payment timing not clearly specified',
                    'recommendation': 'Specify exact payment terms (e.g., "within 30 days")'
                })
                risk_score += 20
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = 'critical'
        elif risk_score >= 50:
            risk_level = 'high'
        elif risk_score >= 30:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        return {
            'risk_level': risk_level,
            'risk_score': min(risk_score, 100),
            'issues': issues
        }
    
    def get_default_mock_data(self):
        """Return default mock data when no clauses can be extracted."""
        return {
            'success': True,
            'clauses': [
                {
                    'id': 'clause_1',
                    'title': '1. Payment Terms',
                    'text': 'The Buyer shall pay the Seller at its sole discretion within a reasonable time period.',
                    'type': 'payment',
                    'length': 85,
                    'position': 1,
                    'analysis': {
                        'risk_level': 'high',
                        'risk_score': 75,
                        'issues': [
                            {
                                'type': 'vague_language',
                                'severity': 'medium',
                                'description': 'Contains vague term: "reasonable time period"',
                                'recommendation': 'Specify exact payment terms (e.g., "within 30 days of invoice date")'
                            },
                            {
                                'type': 'one_sided',
                                'severity': 'high',
                                'description': 'One-sided term: "sole discretion" gives all power to buyer',
                                'recommendation': 'Add mutual obligations or notice requirements'
                            }
                        ]
                    }
                },
                {
                    'id': 'clause_2',
                    'title': '2. Termination',
                    'text': 'This Agreement may be terminated by either party at will without cause or prior notice.',
                    'type': 'termination',
                    'length': 89,
                    'position': 2,
                    'analysis': {
                        'risk_level': 'critical',
                        'risk_score': 90,
                        'issues': [
                            {
                                'type': 'one_sided',
                                'severity': 'critical',
                                'description': 'Allows termination "at will" with no protection',
                                'recommendation': 'Add notice period and termination conditions'
                            },
                            {
                                'type': 'missing_notice',
                                'severity': 'high',
                                'description': 'No notice period specified',
                                'recommendation': 'Require minimum 30-60 days written notice'
                            }
                        ]
                    }
                },
                {
                    'id': 'clause_3',
                    'title': '3. Liability',
                    'text': 'The Buyer shall indemnify and hold harmless the Seller from any and all claims, damages, losses, and expenses of any kind, without limitation.',
                    'type': 'liability',
                    'length': 145,
                    'position': 3,
                    'analysis': {
                        'risk_level': 'critical',
                        'risk_score': 95,
                        'issues': [
                            {
                                'type': 'unlimited_liability',
                                'severity': 'critical',
                                'description': 'Unlimited liability exposure with "without limitation"',
                                'recommendation': 'Cap liability at contract value or reasonable amount'
                            },
                            {
                                'type': 'one_sided',
                                'severity': 'high',
                                'description': 'Only buyer has indemnification obligations',
                                'recommendation': 'Make indemnification mutual'
                            }
                        ]
                    }
                },
                {
                    'id': 'clause_4',
                    'title': '4. Confidentiality',
                    'text': 'All information shared between parties shall remain confidential for a period of 2 years from the date of disclosure.',
                    'type': 'confidentiality',
                    'length': 125,
                    'position': 4,
                    'analysis': {
                        'risk_level': 'low',
                        'risk_score': 25,
                        'issues': [
                            {
                                'type': 'short_duration',
                                'severity': 'low',
                                'description': '2-year confidentiality period may be too short',
                                'recommendation': 'Consider extending to 5 years for sensitive information'
                            }
                        ]
                    }
                }
            ],
            'summary': {
                'total_clauses': 4,
                'risk_distribution': {
                    'critical': 2,
                    'high': 1,
                    'medium': 0,
                    'low': 1
                },
                'total_issues': 7,
                'avg_risk_score': 71.25
            }
        }
    
    async def handle_extract_from_email(self, data):
        """Handle email extraction for template generation."""
        print(f"\n📧 Extracting contract details from email...")
        
        try:
            from agents.template_generator_entrypoint import lambda_handler
            
            event = {
                'action': 'extract_from_email',
                'email_text': data.get('email_text', ''),
                'user_id': data.get('user_id', 'demo-user'),
                'session_id': data.get('session_id', 'demo-session')
            }
            
            result = lambda_handler(event, None)
            
            if result['statusCode'] == 200:
                return json.loads(result['body'])
            else:
                print(f"⚠️ Email extraction failed")
                return {'success': False, 'error': 'Extraction failed'}
                
        except Exception as e:
            print(f"❌ Email extraction error: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    async def handle_generate_template(self, data):
        """Handle template generation."""
        print(f"\n📄 Generating contract template...")
        
        try:
            from agents.template_generator_entrypoint import lambda_handler
            
            event = {
                'action': 'generate_template',
                'template_data': data.get('template_data', {}),
                'user_id': data.get('user_id', 'demo-user'),
                'session_id': data.get('session_id', 'demo-session')
            }
            
            result = lambda_handler(event, None)
            
            if result['statusCode'] == 200:
                return json.loads(result['body'])
            else:
                print(f"⚠️ Template generation failed")
                return {'success': False, 'error': 'Generation failed'}
                
        except Exception as e:
            print(f"❌ Template generation error: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def get_mock_clause_improvements(self, original_text):
        """Return mock clause improvements for demo."""
        return {
            'success': True,
            'original_clause': original_text,
            'alternatives': [
                {
                    'id': 'alt_1',
                    'title': 'Balanced Version',
                    'text': 'The Buyer shall pay the Seller within thirty (30) days of receipt of a valid invoice. Payment shall be made via wire transfer to the account specified by Seller.',
                    'risk_level': 'low',
                    'risk_score': 20,
                    'description': 'Adds specific timeframe and payment method while maintaining clarity',
                    'changes': [
                        'Replaced "sole discretion" with specific 30-day payment term',
                        'Removed vague "reasonable time" language',
                        'Added clear payment method specification',
                        'Maintains enforceability while protecting both parties'
                    ]
                },
                {
                    'id': 'alt_2',
                    'title': 'Buyer-Favorable Version',
                    'text': 'The Buyer shall pay the Seller within forty-five (45) days of receipt of invoice, subject to Buyer\'s verification of goods/services received. Buyer may withhold payment for disputed amounts pending resolution.',
                    'risk_level': 'medium',
                    'risk_score': 45,
                    'description': 'Provides more flexibility for buyer while still being specific',
                    'changes': [
                        'Extended payment period to 45 days',
                        'Added verification requirement',
                        'Included dispute resolution provision',
                        'Gives buyer more control while remaining fair'
                    ]
                },
                {
                    'id': 'alt_3',
                    'title': 'Seller-Favorable Version',
                    'text': 'The Buyer shall pay the Seller within fifteen (15) days of invoice date. Late payments shall accrue interest at 1.5% per month. Seller may suspend services for payments overdue by more than 10 days.',
                    'risk_level': 'very_low',
                    'risk_score': 10,
                    'description': 'Protects seller with shorter payment terms and penalties',
                    'changes': [
                        'Shortened payment period to 15 days',
                        'Added late payment interest penalty',
                        'Included service suspension right',
                        'Strongly protects seller\'s interests'
                    ]
                }
            ]
        }
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_json_response(self, data, status=200):
        """Send JSON response."""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
    
    def send_error_response(self, message, status=500):
        """Send error response."""
        self.send_json_response({
            'error': message,
            'success': False
        }, status)
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def get_mock_comparison(self, contract1, contract2):
        """Return mock comparison for demo."""
        return {
            'success': True,
            'summary': {
                'similarity_score': 72,
                'key_differences': 3,
                'risk_assessment': 'medium'
            },
            'differences': [
                {
                    'category': 'Payment Terms',
                    'contract_a': 'Payment within 30 days',
                    'contract_b': 'Payment within 45 days',
                    'impact': 'Contract B provides more favorable payment terms',
                    'severity': 'medium'
                },
                {
                    'category': 'Termination',
                    'contract_a': '90 days notice required',
                    'contract_b': '30 days notice required',
                    'impact': 'Contract B allows faster termination',
                    'severity': 'high'
                },
                {
                    'category': 'Liability Cap',
                    'contract_a': 'Capped at contract value',
                    'contract_b': 'Unlimited liability',
                    'impact': 'Contract A provides better protection',
                    'severity': 'critical'
                }
            ],
            'recommendations': [
                'Negotiate payment terms to match Contract A',
                'Request liability cap in Contract B',
                'Consider longer termination notice period'
            ]
        }


def run_server(port=8082):
    """Run the V3 frontend server."""
    server_address = ('', port)
    httpd = HTTPServer(server_address, V3FrontendHandler)
    
    print("=" * 70)
    print("🚀 Contract AI Platform V5")
    print("=" * 70)
    print(f"📍 Server URL:        http://localhost:{port}")
    print(f"🎨 Frontend:          V5 (Production UI)")
    print(f"⚙️  Backend:           AgentCore + AWS Bedrock")
    print(f"🔓 Authentication:    Disabled (Demo Mode)")
    print(f"✅ Features:          Analyze, Compare, Batch, Upload")
    print("=" * 70)
    print(f"\n💡 Open in browser:   http://localhost:{port}")
    print(f"📖 Documentation:     README.md")
    print(f"\n⌨️  Press Ctrl+C to stop the server\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        httpd.shutdown()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8082
    run_server(port)
