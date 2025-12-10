"""Hello World agent for testing AgentCore setup."""
import sys
import os
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.aws_config import aws_config


class HelloWorldAgent:
    """Simple agent to verify AgentCore connectivity."""
    
    def __init__(self):
        self.bedrock_client = aws_config.get_bedrock_client()
        self.bedrock_runtime_client = aws_config.get_bedrock_runtime_client()
    
    def test_bedrock_connection(self) -> Dict[str, Any]:
        """Test connection to AWS Bedrock."""
        try:
            # List foundation models to verify access
            response = self.bedrock_client.list_foundation_models()
            
            models = response.get('modelSummaries', [])
            model_count = len(models)
            
            return {
                'success': True,
                'message': f'Successfully connected to AWS Bedrock',
                'model_count': model_count,
                'sample_models': [m['modelId'] for m in models[:5]]
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to connect to AWS Bedrock: {str(e)}',
                'error': str(e)
            }
    
    def invoke_simple_model(self, prompt: str = "Hello, world!") -> Dict[str, Any]:
        """Invoke a simple model to test runtime access."""
        try:
            import json
            
            # Use Claude 3 Haiku for a simple test
            model_id = "anthropic.claude-3-haiku-20240307-v1:0"
            
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 100,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
            
            response = self.bedrock_runtime_client.invoke_model(
                modelId=model_id,
                body=body
            )
            
            response_body = json.loads(response['body'].read())
            
            return {
                'success': True,
                'message': 'Successfully invoked model',
                'model_id': model_id,
                'response': response_body.get('content', [{}])[0].get('text', '')
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to invoke model: {str(e)}',
                'error': str(e)
            }
    
    def run_diagnostics(self) -> Dict[str, Any]:
        """Run full diagnostic tests."""
        print("Running AgentCore Hello World Diagnostics...")
        print("=" * 60)
        
        # Test 1: AWS Configuration
        print("\n1. Testing AWS Configuration...")
        config_info = aws_config.to_dict()
        print(f"   Region: {config_info['region']}")
        print(f"   Account ID: {config_info['account_id']}")
        print(f"   Access Key: {config_info['access_key_id']}")
        
        # Test 2: Bedrock Connection
        print("\n2. Testing Bedrock Connection...")
        bedrock_result = self.test_bedrock_connection()
        if bedrock_result['success']:
            print(f"   ✓ Connected successfully")
            print(f"   ✓ Found {bedrock_result['model_count']} models")
            print(f"   ✓ Sample models: {', '.join(bedrock_result['sample_models'][:3])}")
        else:
            print(f"   ✗ Connection failed: {bedrock_result['message']}")
        
        # Test 3: Model Invocation
        print("\n3. Testing Model Invocation...")
        invoke_result = self.invoke_simple_model("Say 'Hello from AgentCore!'")
        if invoke_result['success']:
            print(f"   ✓ Model invoked successfully")
            print(f"   ✓ Model: {invoke_result['model_id']}")
            print(f"   ✓ Response: {invoke_result['response'][:100]}...")
        else:
            print(f"   ✗ Invocation failed: {invoke_result['message']}")
        
        print("\n" + "=" * 60)
        print("Diagnostics complete!")
        
        return {
            'aws_config': config_info,
            'bedrock_connection': bedrock_result,
            'model_invocation': invoke_result
        }


def main():
    """Main entry point for hello world agent."""
    agent = HelloWorldAgent()
    results = agent.run_diagnostics()
    
    # Return exit code based on success
    all_success = (
        results['bedrock_connection']['success'] and
        results['model_invocation']['success']
    )
    
    return 0 if all_success else 1


if __name__ == '__main__':
    exit(main())
