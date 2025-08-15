#!/usr/bin/env python3
"""
Extract specific files or sections from repomix output
Usage: python3 extract-from-repomix.py <file_path>
Examples:
  python3 extract-from-repomix.py "src/hooks/useInterviewsQuery.ts"
  python3 extract-from-repomix.py "src/lib/constants.ts"
  python3 extract-from-repomix.py "src/app/(client)/dashboard/page.tsx"
"""

import sys
import re

def extract_file_from_repomix(repomix_path, target_file_path):
    """Extract a specific file's content from repomix output"""
    try:
        with open(repomix_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for the file section using pattern: <file path="target_file_path">
        pattern = rf'<file path="{re.escape(target_file_path)}">(.*?)</file>'
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            file_content = match.group(1).strip()
            print(f"=== {target_file_path} ===")
            print(file_content)
            return file_content
        else:
            print(f"File not found: {target_file_path}")
            print("Available files containing similar names:")
            # Find similar file paths
            similar_pattern = rf'<file path="([^"]*{re.escape(target_file_path.split("/")[-1])}[^"]*)">'
            similar_files = re.findall(similar_pattern, content)
            for similar_file in similar_files[:10]:  # Show first 10 matches
                print(f"  - {similar_file}")
            return None
            
    except FileNotFoundError:
        print(f"Repomix file not found: {repomix_path}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def list_files_in_directory(repomix_path, directory_path):
    """List all files in a specific directory from repomix output"""
    try:
        with open(repomix_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all files in the directory
        pattern = rf'<file path="({re.escape(directory_path)}/[^"]*)">'
        files = re.findall(pattern, content)
        
        print(f"=== Files in {directory_path}/ ===")
        for file_path in sorted(files):
            print(f"  - {file_path}")
        
        return files
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    
    repomix_file = "/home/mois/ai-interviewer/repomix-output.xml"
    target = sys.argv[1]
    
    if target.endswith("/"):
        # List directory contents
        list_files_in_directory(repomix_file, target.rstrip("/"))
    else:
        # Extract specific file
        extract_file_from_repomix(repomix_file, target)