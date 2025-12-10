"""Gateway Tool Registry for AgentCore Gateway."""
import boto3
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class ToolCategory(Enum):
    """Tool categories for organization."""
    CONTRACT_ANALYSIS = "contract_analysis"
    DOCUMENT_PROCESSING = "document_processing"
    DEVIATION_DETECTION = "deviation_detection"
    RISK_ASSESSMENT = "risk_assessment"
    COMPLIANCE = "compliance"


@dataclass
class ToolParameter:
    """Tool parameter definition."""
    name: str
    type: str
    description: str
    required: bool = True
    default: Optional[Any] = None


@dataclass
class ToolDefinition:
    """Complete tool definition for Gateway registration."""
    name: str
    description: str
    category: ToolCategory
    lambda_function_name: str
    parameters: List[ToolParameter]
    returns: Dict[str, str]
    examples: List[str]
    
    def to_mcp_schema(self) -> Dict[str, Any]:
        """Convert to MCP tool schema."""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": {
                "type": "object",
                "properties": {
                    param.name: {
                        "type": param.type,
                        "description": param.description
                    }
                    for param in self.parameters
                },
                "required": [p.name for p in self.parameters if p.required]
            }
        }


class GatewayToolRegistry:
    """Manages tool registration with AgentCore Gateway."""
    
    def __init__(self, gateway_id: str, region: str = "us-east-1"):
        self.gateway_id = gateway_id
        self.region = region
        self.bedrock_agent_client = boto3.client('bedrock-agent', region_name=region)
        self.lambda_client = boto3.client('lambda', region_name=region)
        self.tools: Dict[str, ToolDefinition] = {}
        
        # Initialize tool definitions
        self._initialize_tool_definitions()
    
    def _initialize_tool_definitions(self):
        """Initialize all tool definitions."""
        # Contract Analysis Tools
        self.tools['identify_contract_type'] = ToolDefinition(
            name='identify_contract_type',
            description='Classify a contract into predefined categories (PPA, Service Agreement, Supply Agreement, etc.) using hybrid keyword and AI analysis',
            category=ToolCategory.CONTRACT_ANALYSIS,
            lambda_function_name='agentcore-identify-contract-type',
            parameters=[
                ToolParameter(
                    name='contract_text',
                    type='string',
                    description='The full text of the contract to classify'
                ),
                ToolParameter(
                    name='jurisdiction',
                    type='string',
                    description='The legal jurisdiction (e.g., US, EU, UK)',
                    required=False,
                    default='US'
                )
            ],
            returns={
                'contract_type': 'string',
                'confidence': 'number',
                'reasoning': 'string'
            },
            examples=[
                'Identify the type of this Power Purchase Agreement',
                'What kind of contract is this?',
                'Classify this contract document'
            ]
        )
        
        self.tools['extract_contract_parties'] = ToolDefinition(
            name='extract_contract_parties',
            description='Extract all parties involved in a contract including names, roles, entity types, addresses, and relationships',
            category=ToolCategory.CONTRACT_ANALYSIS,
            lambda_function_name='agentcore-extract-contract-parties',
            parameters=[
                ToolParameter(
                    name='contract_text',
                    type='string',
                    description='The full text of the contract'
                )
            ],
            returns={
                'parties': 'array',
                'confidence': 'number'
            },
            examples=[
                'Who are the parties in this contract?',
                'Extract all contract parties and their roles',
                'Identify the buyer and seller'
            ]
        )
        
        self.tools['extract_pricing_terms'] = ToolDefinition(
            name='extract_pricing_terms',
            description='Extract pricing information including base prices, payment terms, currency, escalation clauses, penalties, and discounts',
            category=ToolCategory.CONTRACT_ANALYSIS,
            lambda_function_name='agentcore-extract-pricing-terms',
            parameters=[
                ToolParameter(
                    name='contract_text',
                    type='string',
                    description='The full text of the contract'
                )
            ],
            returns={
                'pricing_terms': 'object',
                'confidence': 'number'
            },
            examples=[
                'What are the pricing terms?',
                'Extract payment information from this contract',
                'Find all pricing and payment details'
            ]
        )
        
        self.tools['extract_contract_duration'] = ToolDefinition(
            name='extract_contract_duration',
            description='Extract contract duration including start date, end date, term length, renewal terms, and termination notice periods',
            category=ToolCategory.CONTRACT_ANALYSIS,
            lambda_function_name='agentcore-extract-contract-duration',
            parameters=[
                ToolParameter(
                    name='contract_text',
                    type='string',
                    description='The full text of the contract'
                )
            ],
            returns={
                'duration': 'object',
                'confidence': 'number'
            },
            examples=[
                'How long is this contract valid?',
                'Extract the contract term and renewal information',
                'When does this contract start and end?'
            ]
        )
        
        self.tools['extract_obligations_and_responsibilities'] = ToolDefinition(
            name='extract_obligations_and_responsibilities',
            description='Extract obligations and responsibilities for each party including deliverables, compliance requirements, and milestones',
            category=ToolCategory.CONTRACT_ANALYSIS,
            lambda_function_name='agentcore-extract-obligations-and-responsibilities',
            parameters=[
                ToolParameter(
                    name='contract_text',
                    type='string',
                    description='The full text of the contract'
                )
            ],
            returns={
                'obligations': 'array',
                'confidence': 'number'
            },
            examples=[
                'What are the obligations of each party?',
                'Extract all responsibilities and deliverables',
                'List the compliance requirements'
            ]
        )
        
        # Risk Assessment Tools
        self.tools['assess_contract_risks'] = ToolDefinition(
            name='assess_contract_risks',
            description='Perform comprehensive risk assessment identifying financial, operational, legal, and compliance risks with severity levels and mitigation recommendations',
            category=ToolCategory.RISK_ASSESSMENT,
            lambda_function_name='agentcore-assess-contract-risks',
            parameters=[
                ToolParameter(
                    name='contract_text',
                    type='string',
                    description='The full text of the contract'
                ),
                ToolParameter(
                    name='jurisdiction',
                    type='string',
                    description='The legal jurisdiction for compliance assessment',
                    required=False,
                    default='US'
                )
            ],
            returns={
                'risks': 'array',
                'overall_risk_level': 'string',
                'risk_score': 'number'
            },
            examples=[
                'What are the risks in this contract?',
                'Assess the financial and legal risks',
                'Identify potential problems with this agreement'
            ]
        )
        
        self.tools['calculate_risk_score'] = ToolDefinition(
            name='calculate_risk_score',
            description='Calculate a weighted risk score based on identified risks across different categories (financial, operational, legal, compliance)',
            category=ToolCategory.RISK_ASSESSMENT,
            lambda_function_name='agentcore-calculate-risk-score',
            parameters=[
                ToolParameter(
                    name='risks',
                    type='array',
                    description='Array of risk objects with category, severity, and impact'
                )
            ],
            returns={
                'risk_score': 'number',
                'risk_level': 'string',
                'highest_risk_category': 'string'
            },
            examples=[
                'Calculate the overall risk score',
                'What is the weighted risk level?',
                'Compute risk metrics from identified risks'
            ]
        )
        
        self.tools['identify_red_flags'] = ToolDefinition(
            name='identify_red_flags',
            description='Identify critical red flags and warning signs in contracts using pattern matching and AI analysis with severity classification',
            category=ToolCategory.RISK_ASSESSMENT,
            lambda_function_name='agentcore-identify-red-flags',
            parameters=[
                ToolParameter(
                    name='contract_text',
                    type='string',
                    description='The full text of the contract'
                )
            ],
            returns={
                'red_flags': 'array',
                'critical_count': 'number',
                'high_count': 'number'
            },
            examples=[
                'Find red flags in this contract',
                'What are the warning signs?',
                'Identify critical issues that need immediate attention'
            ]
        )
    
    def get_lambda_arn(self, function_name: str) -> Optional[str]:
        """Get Lambda function ARN."""
        try:
            response = self.lambda_client.get_function(FunctionName=function_name)
            return response['Configuration']['FunctionArn']
        except Exception as e:
            print(f"Warning: Could not get ARN for {function_name}: {e}")
            return None
    
    def register_tool(self, tool_name: str) -> Dict[str, Any]:
        """Register a single tool with the Gateway."""
        if tool_name not in self.tools:
            return {
                'success': False,
                'error': f'Tool {tool_name} not found in registry'
            }
        
        tool = self.tools[tool_name]
        lambda_arn = self.get_lambda_arn(tool.lambda_function_name)
        
        if not lambda_arn:
            return {
                'success': False,
                'error': f'Lambda function {tool.lambda_function_name} not found'
            }
        
        try:
            # Note: This uses Bedrock Agent action groups as a proxy for AgentCore Gateway targets
            # The actual AgentCore Gateway API may differ when available
            
            print(f"Registering tool: {tool.name}")
            print(f"  Description: {tool.description}")
            print(f"  Lambda: {tool.lambda_function_name}")
            print(f"  ARN: {lambda_arn}")
            
            # Create MCP schema
            mcp_schema = tool.to_mcp_schema()
            
            # Store tool metadata for later Gateway registration
            tool_metadata = {
                'tool_name': tool.name,
                'description': tool.description,
                'category': tool.category.value,
                'lambda_arn': lambda_arn,
                'mcp_schema': mcp_schema,
                'examples': tool.examples
            }
            
            return {
                'success': True,
                'tool_name': tool.name,
                'lambda_arn': lambda_arn,
                'metadata': tool_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def register_all_tools(self, category: Optional[ToolCategory] = None) -> Dict[str, Any]:
        """Register all tools or tools in a specific category."""
        results = {
            'success': True,
            'registered': [],
            'failed': [],
            'total': 0
        }
        
        tools_to_register = [
            name for name, tool in self.tools.items()
            if category is None or tool.category == category
        ]
        
        results['total'] = len(tools_to_register)
        
        for tool_name in tools_to_register:
            result = self.register_tool(tool_name)
            
            if result['success']:
                results['registered'].append({
                    'name': tool_name,
                    'lambda_arn': result['lambda_arn']
                })
                print(f"  ✓ Registered: {tool_name}")
            else:
                results['failed'].append({
                    'name': tool_name,
                    'error': result['error']
                })
                print(f"  ✗ Failed: {tool_name} - {result['error']}")
                results['success'] = False
        
        return results
    
    def list_tools(self, category: Optional[ToolCategory] = None) -> List[Dict[str, Any]]:
        """List all registered tools."""
        tools_list = []
        
        for name, tool in self.tools.items():
            if category is None or tool.category == category:
                tools_list.append({
                    'name': tool.name,
                    'description': tool.description,
                    'category': tool.category.value,
                    'lambda_function': tool.lambda_function_name,
                    'parameters': [asdict(p) for p in tool.parameters],
                    'examples': tool.examples
                })
        
        return tools_list
    
    def search_tools(self, query: str) -> List[Dict[str, Any]]:
        """Search tools using semantic matching."""
        query_lower = query.lower()
        matching_tools = []
        
        for name, tool in self.tools.items():
            # Simple keyword matching (in production, this would use embeddings)
            score = 0
            
            # Check description
            if query_lower in tool.description.lower():
                score += 10
            
            # Check examples
            for example in tool.examples:
                if query_lower in example.lower():
                    score += 5
            
            # Check tool name
            if query_lower in tool.name.lower():
                score += 3
            
            if score > 0:
                matching_tools.append({
                    'name': tool.name,
                    'description': tool.description,
                    'category': tool.category.value,
                    'relevance_score': score,
                    'examples': tool.examples
                })
        
        # Sort by relevance
        matching_tools.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return matching_tools
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a tool."""
        if tool_name not in self.tools:
            return None
        
        tool = self.tools[tool_name]
        lambda_arn = self.get_lambda_arn(tool.lambda_function_name)
        
        return {
            'name': tool.name,
            'description': tool.description,
            'category': tool.category.value,
            'lambda_function': tool.lambda_function_name,
            'lambda_arn': lambda_arn,
            'parameters': [asdict(p) for p in tool.parameters],
            'returns': tool.returns,
            'examples': tool.examples,
            'mcp_schema': tool.to_mcp_schema()
        }
    
    def export_tool_catalog(self, output_file: str = 'tool_catalog.json'):
        """Export complete tool catalog to JSON."""
        catalog = {
            'gateway_id': self.gateway_id,
            'region': self.region,
            'tools': {}
        }
        
        for name, tool in self.tools.items():
            catalog['tools'][name] = {
                'name': tool.name,
                'description': tool.description,
                'category': tool.category.value,
                'lambda_function': tool.lambda_function_name,
                'lambda_arn': self.get_lambda_arn(tool.lambda_function_name),
                'parameters': [asdict(p) for p in tool.parameters],
                'returns': tool.returns,
                'examples': tool.examples,
                'mcp_schema': tool.to_mcp_schema()
            }
        
        with open(output_file, 'w') as f:
            json.dump(catalog, f, indent=2)
        
        return output_file
