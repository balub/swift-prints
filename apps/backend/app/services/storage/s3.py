"""
AWS S3 storage backend.
"""
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from typing import Optional, BinaryIO
from urllib.parse import urljoin

from app.core.config import settings
from .base import StorageBackend


class S3StorageBackend(StorageBackend):
    """AWS S3 storage implementation."""

    def __init__(self):
        """Initialize S3 storage backend."""
        if not all([settings.aws_access_key, settings.aws_secret_key, settings.aws_bucket]):
            raise ValueError(
                "AWS credentials and bucket name are required for S3 storage")

        self.bucket_name = settings.aws_bucket
        self.region = settings.aws_region

        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key,
            aws_secret_access_key=settings.aws_secret_key,
            region_name=self.region
        )

        # Verify bucket access
        self._verify_bucket_access()

    def _verify_bucket_access(self):
        """Verify that we can access the S3 bucket."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                raise ValueError(
                    f"S3 bucket '{self.bucket_name}' does not exist")
            elif error_code == '403':
                raise ValueError(
                    f"Access denied to S3 bucket '{self.bucket_name}'")
            else:
                raise ValueError(f"Error accessing S3 bucket: {e}")
        except NoCredentialsError:
            raise ValueError("AWS credentials not found")

    def store_file(self, key: str, file_data: BinaryIO, content_type: Optional[str] = None) -> str:
        """Store file to S3."""
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type

            self.s3_client.upload_fileobj(
                file_data,
                self.bucket_name,
                key,
                ExtraArgs=extra_args
            )

            return f"s3://{self.bucket_name}/{key}"

        except ClientError as e:
            raise Exception(f"Failed to upload file to S3: {e}")

    def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """Get presigned URL to access the file."""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate presigned URL: {e}")

    def delete_file(self, key: str) -> bool:
        """Delete file from S3."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False

    def file_exists(self, key: str) -> bool:
        """Check if file exists in S3."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False

    def get_file_size(self, key: str) -> Optional[int]:
        """Get file size in bytes."""
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name, Key=key)
            return response['ContentLength']
        except ClientError:
            return None

    def generate_upload_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate presigned URL for direct upload to S3."""
        try:
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate upload URL: {e}")

    def get_file_stream(self, key: str) -> Optional[BinaryIO]:
        """
        Get file as a binary stream from S3.

        Args:
            key: File key

        Returns:
            Optional[BinaryIO]: File stream or None if not found
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name, Key=key)
            return response['Body']
        except ClientError:
            return None
