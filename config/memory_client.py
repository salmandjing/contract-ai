"""AgentCore Memory client for contract analyses."""
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from .aws_config import aws_config
from .agentcore_config import agentcore_config


class MemoryClient:
    """Client for interacting with AgentCore Memory."""
    
    def __init__(self):
        self.dynamodb_client = aws_config.get_client('dynamodb')
        self.namespace = agentcore_config.memory_namespace
        self.short_term_table = f"{self.namespace}-short-term"
        self.long_term_table = f"{self.namespace}-long-term"
    
    # Short-term memory operations
    
    def store_session_data(self, session_id: str, user_id: str, data: Dict[str, Any]) -> bool:
        """Store data in short-term memory (1-hour TTL)."""
        try:
            ttl = int((datetime.now() + timedelta(hours=1)).timestamp())
            timestamp = int(datetime.now().timestamp())
            
            self.dynamodb_client.put_item(
                TableName=self.short_term_table,
                Item={
                    'session_id': {'S': session_id},
                    'timestamp': {'N': str(timestamp)},
                    'user_id': {'S': user_id},
                    'data': {'S': json.dumps(data)},
                    'ttl': {'N': str(ttl)}
                }
            )
            return True
        except Exception as e:
            print(f"Error storing session data: {str(e)}")
            return False
    
    def get_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve data from short-term memory."""
        try:
            # Query all items for this session
            response = self.dynamodb_client.query(
                TableName=self.short_term_table,
                KeyConditionExpression='session_id = :sid',
                ExpressionAttributeValues={
                    ':sid': {'S': session_id}
                },
                ScanIndexForward=False,  # Most recent first
                Limit=1
            )
            
            if response['Items']:
                item = response['Items'][0]
                return json.loads(item['data']['S'])
            
            return None
        except Exception as e:
            print(f"Error retrieving session data: {str(e)}")
            return None
    
    # Long-term memory operations
    
    def store_analysis(self, user_id: str, contract_id: str, analysis: Dict[str, Any]) -> bool:
        """Store contract analysis in long-term memory."""
        try:
            memory_key = f"contract:{contract_id}"
            timestamp = int(datetime.now().timestamp())
            
            self.dynamodb_client.put_item(
                TableName=self.long_term_table,
                Item={
                    'user_id': {'S': user_id},
                    'memory_key': {'S': memory_key},
                    'timestamp': {'N': str(timestamp)},
                    'data': {'S': json.dumps(analysis)},
                    'contract_id': {'S': contract_id}
                }
            )
            return True
        except Exception as e:
            print(f"Error storing analysis: {str(e)}")
            return False
    
    def get_analysis(self, user_id: str, contract_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve specific contract analysis."""
        try:
            memory_key = f"contract:{contract_id}"
            
            response = self.dynamodb_client.get_item(
                TableName=self.long_term_table,
                Key={
                    'user_id': {'S': user_id},
                    'memory_key': {'S': memory_key}
                }
            )
            
            if 'Item' in response:
                return json.loads(response['Item']['data']['S'])
            
            return None
        except Exception as e:
            print(f"Error retrieving analysis: {str(e)}")
            return None
    
    def get_user_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's analysis history."""
        try:
            response = self.dynamodb_client.query(
                TableName=self.long_term_table,
                IndexName='TimestampIndex',
                KeyConditionExpression='user_id = :uid',
                ExpressionAttributeValues={
                    ':uid': {'S': user_id}
                },
                ScanIndexForward=False,  # Most recent first
                Limit=limit
            )
            
            results = []
            for item in response['Items']:
                data = json.loads(item['data']['S'])
                data['timestamp'] = int(item['timestamp']['N'])
                results.append(data)
            
            return results
        except Exception as e:
            print(f"Error retrieving user history: {str(e)}")
            return []
    
    def store_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """Store user preferences in long-term memory."""
        try:
            memory_key = "preferences"
            timestamp = int(datetime.now().timestamp())
            
            self.dynamodb_client.put_item(
                TableName=self.long_term_table,
                Item={
                    'user_id': {'S': user_id},
                    'memory_key': {'S': memory_key},
                    'timestamp': {'N': str(timestamp)},
                    'data': {'S': json.dumps(preferences)}
                }
            )
            return True
        except Exception as e:
            print(f"Error storing preferences: {str(e)}")
            return False
    
    def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user preferences."""
        try:
            memory_key = "preferences"
            
            response = self.dynamodb_client.get_item(
                TableName=self.long_term_table,
                Key={
                    'user_id': {'S': user_id},
                    'memory_key': {'S': memory_key}
                }
            )
            
            if 'Item' in response:
                return json.loads(response['Item']['data']['S'])
            
            return None
        except Exception as e:
            print(f"Error retrieving preferences: {str(e)}")
            return None
    
    def delete_analysis(self, user_id: str, contract_id: str) -> bool:
        """Delete a contract analysis."""
        try:
            memory_key = f"contract:{contract_id}"
            
            self.dynamodb_client.delete_item(
                TableName=self.long_term_table,
                Key={
                    'user_id': {'S': user_id},
                    'memory_key': {'S': memory_key}
                }
            )
            return True
        except Exception as e:
            print(f"Error deleting analysis: {str(e)}")
            return False


# Global memory client instance
memory_client = MemoryClient()
