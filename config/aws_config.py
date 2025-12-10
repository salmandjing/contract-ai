"""AWS configuration and credentials management."""
import os
from typing import Dict, Optional
from dotenv import load_dotenv
import boto3
from botocore.config import Config

# Load environment variables
load_dotenv()


class AWSConfig:
    """AWS configuration manager."""
    
    def __init__(self):
        self.access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.region = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
        self.account_id = os.getenv('AWS_ACCOUNT_ID')
        
        # Validate required credentials
        if not self.access_key_id or not self.secret_access_key:
            raise ValueError("AWS credentials not found in environment variables")
    
    def get_boto3_session(self) -> boto3.Session:
        """Create and return a boto3 session with configured credentials."""
        return boto3.Session(
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name=self.region
        )
    
    def get_client(self, service_name: str, **kwargs) -> boto3.client:
        """Create and return a boto3 client for the specified service."""
        session = self.get_boto3_session()
        
        # Configure with retry logic
        config = Config(
            retries={
                'max_attempts': 3,
                'mode': 'adaptive'
            },
            **kwargs
        )
        
        return session.client(service_name, config=config)
    
    def get_bedrock_client(self):
        """Get Bedrock client."""
        return self.get_client('bedrock')
    
    def get_bedrock_runtime_client(self):
        """Get Bedrock Runtime client."""
        return self.get_client('bedrock-runtime')
    
    def get_bedrock_agent_client(self):
        """Get Bedrock Agent client."""
        return self.get_client('bedrock-agent')
    
    def get_bedrock_agent_runtime_client(self):
        """Get Bedrock Agent Runtime client."""
        return self.get_client('bedrock-agent-runtime')
    
    def get_cognito_client(self):
        """Get Cognito Identity Provider client."""
        return self.get_client('cognito-idp')
    
    def get_lambda_client(self):
        """Get Lambda client."""
        return self.get_client('lambda')
    
    def get_iam_client(self):
        """Get IAM client."""
        return self.get_client('iam')
    
    def get_cloudwatch_client(self):
        """Get CloudWatch client."""
        return self.get_client('cloudwatch')
    
    def get_xray_client(self):
        """Get X-Ray client."""
        return self.get_client('xray')
    
    def to_dict(self) -> Dict[str, str]:
        """Return configuration as dictionary (without sensitive data)."""
        return {
            'region': self.region,
            'account_id': self.account_id,
            'access_key_id': self.access_key_id[:8] + '...' if self.access_key_id else None
        }


# Global configuration instance
aws_config = AWSConfig()
