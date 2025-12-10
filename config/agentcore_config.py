"""AgentCore-specific configuration."""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class AgentCoreConfig:
    """AgentCore configuration manager."""
    
    def __init__(self):
        # Gateway configuration
        self.gateway_id: Optional[str] = os.getenv('AGENTCORE_GATEWAY_ID')
        self.gateway_endpoint: Optional[str] = os.getenv('AGENTCORE_GATEWAY_ENDPOINT')
        
        # Memory configuration
        self.memory_namespace: str = os.getenv('AGENTCORE_MEMORY_NAMESPACE', 'contract-analyses')
        
        # Identity configuration
        self.identity_provider_id: Optional[str] = os.getenv('AGENTCORE_IDENTITY_PROVIDER_ID')
        
        # Cognito configuration
        self.cognito_user_pool_id: Optional[str] = os.getenv('COGNITO_USER_POOL_ID')
        self.cognito_client_id: Optional[str] = os.getenv('COGNITO_CLIENT_ID')
        self.cognito_client_secret: Optional[str] = os.getenv('COGNITO_CLIENT_SECRET')
        
        # Observability configuration
        self.enable_tracing: bool = os.getenv('ENABLE_TRACING', 'true').lower() == 'true'
        self.enable_metrics: bool = os.getenv('ENABLE_METRICS', 'true').lower() == 'true'
        self.cloudwatch_log_group: str = os.getenv('CLOUDWATCH_LOG_GROUP', '/aws/agentcore/contract-platform')
        self.xray_daemon_address: str = os.getenv('XRAY_DAEMON_ADDRESS', '127.0.0.1:2000')
        
        # Application configuration
        self.environment: str = os.getenv('ENVIRONMENT', 'development')
        self.log_level: str = os.getenv('LOG_LEVEL', 'INFO')
    
    def is_gateway_configured(self) -> bool:
        """Check if Gateway is configured."""
        return bool(self.gateway_id and self.gateway_endpoint)
    
    def is_identity_configured(self) -> bool:
        """Check if Identity is configured."""
        return bool(self.identity_provider_id and self.cognito_user_pool_id)
    
    def update_gateway_config(self, gateway_id: str, gateway_endpoint: str):
        """Update Gateway configuration."""
        self.gateway_id = gateway_id
        self.gateway_endpoint = gateway_endpoint
        
        # Update .env file
        self._update_env_file('AGENTCORE_GATEWAY_ID', gateway_id)
        self._update_env_file('AGENTCORE_GATEWAY_ENDPOINT', gateway_endpoint)
    
    def update_identity_config(self, identity_provider_id: str):
        """Update Identity configuration."""
        self.identity_provider_id = identity_provider_id
        self._update_env_file('AGENTCORE_IDENTITY_PROVIDER_ID', identity_provider_id)
    
    def update_cognito_config(self, user_pool_id: str, client_id: str, client_secret: str):
        """Update Cognito configuration."""
        self.cognito_user_pool_id = user_pool_id
        self.cognito_client_id = client_id
        self.cognito_client_secret = client_secret
        
        self._update_env_file('COGNITO_USER_POOL_ID', user_pool_id)
        self._update_env_file('COGNITO_CLIENT_ID', client_id)
        self._update_env_file('COGNITO_CLIENT_SECRET', client_secret)
    
    def _update_env_file(self, key: str, value: str):
        """Update a value in the .env file."""
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        
        if not os.path.exists(env_path):
            return
        
        with open(env_path, 'r') as f:
            lines = f.readlines()
        
        updated = False
        for i, line in enumerate(lines):
            if line.startswith(f'{key}='):
                lines[i] = f'{key}={value}\n'
                updated = True
                break
        
        if not updated:
            lines.append(f'{key}={value}\n')
        
        with open(env_path, 'w') as f:
            f.writelines(lines)


# Global configuration instance
agentcore_config = AgentCoreConfig()
