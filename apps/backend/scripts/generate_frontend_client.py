#!/usr/bin/env python3
"""
Script to generate frontend API client and integration files.
"""
from app.utils.api_client_generator import APIClientGenerator
import sys
import os
from pathlib import Path

# Add the app directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def main():
    """Generate frontend integration files."""

    # Create generator
    generator = APIClientGenerator(base_url="http://localhost:8000")

    # Generate files
    output_dir = Path(__file__).parent.parent / "frontend-integration"
    generator.save_client_files(str(output_dir))

    print("✅ Frontend integration files generated successfully!")
    print(f"📁 Output directory: {output_dir}")
    print("\n📋 Generated files:")
    print("  - api-client.ts: TypeScript API client")
    print("  - api-hooks.ts: React hooks for API integration")
    print("  - INTEGRATION_GUIDE.md: Integration documentation")
    print("  - endpoints.json: API endpoints reference")

    print("\n🚀 Next steps:")
    print("  1. Copy the generated files to your frontend project")
    print("  2. Install required dependencies (if any)")
    print("  3. Configure the base URL for your environment")
    print("  4. Follow the integration guide to implement API calls")


if __name__ == "__main__":
    main()
