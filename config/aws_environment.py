"""
AWS Environment Configuration
Auto-generated from CloudFormation stack outputs
"""
import os
import json
from pathlib import Path
from typing import Dict, Any

class AWSEnvironment:
    """AWS Environment configuration loaded from environment variables or JSON config"""
    
    def __init__(self, environment: str = None):
        self.environment = environment or os.getenv('ENVIRONMENT', 'dev')
        self._config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file or environment variables"""
        config_file = Path(__file__).parent / f"environment-{self.environment}.json"
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                return json.load(f)
        
        # Fallback to environment variables
        return {
            'environment': os.getenv('ENVIRONMENT', 'dev'),
            'region': os.getenv('AWS_REGION', 'us-east-1'),
            'accountId': os.getenv('AWS_ACCOUNT_ID'),
            'stackName': os.getenv('STACK_NAME'),
            's3': {
                'frontendBucket': os.getenv('FRONTEND_BUCKET_NAME'),
                'documentBucket': os.getenv('DOCUMENT_BUCKET_NAME'),
                'frontendWebsiteUrl': os.getenv('FRONTEND_WEBSITE_URL')
            },
            'dynamodb': {
                'analysisResultsTable': os.getenv('ANALYSIS_RESULTS_TABLE'),
                'comparisonResultsTable': os.getenv('COMPARISON_RESULTS_TABLE'),
                'ttlDays': int(os.getenv('DYNAMODB_TTL_DAYS', '30'))
            },
            'iam': {
                'lambdaExecutionRoleArn': os.getenv('LAMBDA_EXECUTION_ROLE_ARN'),
                'bedrockAgentRoleArn': os.getenv('BEDROCK_AGENT_ROLE_ARN'),
                'apiGatewayRoleArn': os.getenv('API_GATEWAY_ROLE_ARN')
            },
            'cloudwatch': {
                'apiGatewayLogGroup': os.getenv('API_GATEWAY_LOG_GROUP'),
                'logLevel': os.getenv('LOG_LEVEL', 'INFO')
            },
            'lambda': {
                'timeout': int(os.getenv('LAMBDA_TIMEOUT', '60')),
                'memorySize': int(os.getenv('LAMBDA_MEMORY_SIZE', '1024'))
            },
            'bedrock': {
                'modelId': os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0'),
                'maxTokens': int(os.getenv('BEDROCK_MAX_TOKENS', '4096')),
                'temperature': float(os.getenv('BEDROCK_TEMPERATURE', '0.7'))
            },
            'apiGateway': {
                'rateLimit': int(os.getenv('API_RATE_LIMIT', '100')),
                'burstLimit': int(os.getenv('API_BURST_LIMIT', '200'))
            },
            'observability': {
                'enableTracing': os.getenv('ENABLE_TRACING', 'true').lower() == 'true',
                'enableMetrics': os.getenv('ENABLE_METRICS', 'true').lower() == 'true',
                'cloudwatchLogGroup': os.getenv('CLOUDWATCH_LOG_GROUP'),
                'xrayDaemonAddress': os.getenv('XRAY_DAEMON_ADDRESS', '127.0.0.1:2000')
            }
        }
    
    @property
    def region(self) -> str:
        return self._config['region']
    
    @property
    def account_id(self) -> str:
        return self._config['accountId']
    
    @property
    def stack_name(self) -> str:
        return self._config['stackName']
    
    @property
    def frontend_bucket(self) -> str:
        return self._config['s3']['frontendBucket']
    
    @property
    def document_bucket(self) -> str:
        return self._config['s3']['documentBucket']
    
    @property
    def frontend_website_url(self) -> str:
        return self._config['s3']['frontendWebsiteUrl']
    
    @property
    def analysis_table(self) -> str:
        return self._config['dynamodb']['analysisResultsTable']
    
    @property
    def comparison_table(self) -> str:
        return self._config['dynamodb']['comparisonResultsTable']
    
    @property
    def lambda_role_arn(self) -> str:
        return self._config['iam']['lambdaExecutionRoleArn']
    
    @property
    def bedrock_role_arn(self) -> str:
        return self._config['iam']['bedrockAgentRoleArn']
    
    @property
    def api_gateway_role_arn(self) -> str:
        return self._config['iam']['apiGatewayRoleArn']
    
    @property
    def bedrock_model_id(self) -> str:
        return self._config['bedrock']['modelId']
    
    def get_config(self) -> Dict[str, Any]:
        """Get the full configuration dictionary"""
        return self._config


# Singleton instance
_env_instance = None

def get_environment(environment: str = None) -> AWSEnvironment:
    """Get or create the environment configuration singleton"""
    global _env_instance
    if _env_instance is None or (environment and environment != _env_instance.environment):
        _env_instance = AWSEnvironment(environment)
    return _env_instance
