import os
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

class FileService:
    def __init__(self, base_dir: Optional[str] = None):
        # Default to workspace root or user home/documents
        self.base_dir = os.path.abspath(base_dir or os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

    def _resolve_safe_path(self, rel_path: str) -> Optional[str]:
        """Prevents directory traversal outside allowed workspace."""
        clean = rel_path.strip().lstrip("/\\")
        target = os.path.abspath(os.path.join(self.base_dir, clean))
        # Ensure target starts with base_dir
        if not target.startswith(self.base_dir):
            return None
        return target

    def list_files(self, sub_dir: str = "", max_items: int = 60) -> Dict[str, Any]:
        """Lists files and folders within authorized directory."""
        target_dir = self._resolve_safe_path(sub_dir)
        if not target_dir or not os.path.exists(target_dir):
            return {"success": False, "error": "Invalid or inaccessible directory", "items": []}

        items = []
        try:
            with os.scandir(target_dir) as entries:
                for entry in entries:
                    if entry.name.startswith(('.', '__pycache__', 'node_modules')):
                        continue
                    stats = entry.stat()
                    items.append({
                        "name": entry.name,
                        "path": os.path.relpath(entry.path, self.base_dir).replace("\\", "/"),
                        "is_dir": entry.is_dir(),
                        "size_bytes": stats.st_size if entry.is_file() else 0,
                        "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                        "ext": os.path.splitext(entry.name)[1].lower() if entry.is_file() else ""
                    })
                    if len(items) >= max_items:
                        break
            
            # Sort directories first, then alphabetically
            items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
            return {
                "success": True,
                "current_path": os.path.relpath(target_dir, self.base_dir).replace("\\", "/"),
                "items": items,
                "total": len(items)
            }
        except Exception as e:
            return {"success": False, "error": str(e), "items": []}

    def read_file_content(self, rel_path: str, max_chars: int = 15000) -> Dict[str, Any]:
        """Safely reads text, markdown, code, and document files."""
        safe_path = self._resolve_safe_path(rel_path)
        if not safe_path or not os.path.isfile(safe_path):
            return {"success": False, "error": "File does not exist or access denied"}

        ext = os.path.splitext(safe_path)[1].lower()
        try:
            # Handle standard text/code/markdown/json files
            with open(safe_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(max_chars)
            
            truncated = os.path.getsize(safe_path) > max_chars
            return {
                "success": True,
                "path": rel_path,
                "extension": ext,
                "content": content,
                "size_bytes": os.path.getsize(safe_path),
                "is_truncated": truncated
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def summarize_document(self, rel_path: str) -> Dict[str, Any]:
        """Generates a concise executive summary of a document or source file."""
        read_res = self.read_file_content(rel_path, max_chars=25000)
        if not read_res["success"]:
            return read_res

        content = read_res["content"]
        # Basic smart linguistic summarization
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        lines = [line.strip() for line in content.split("\n") if line.strip()]
        
        headings = [h for h in lines if h.startswith(('#', '===', '---', 'def ', 'class '))]
        
        summary_sentences = []
        for p in paragraphs[:6]:
            if not p.startswith(('import ', 'from ', '{', '<', '//', '#')):
                sentences = re.split(r'(?<=[.!?])\s+', p)
                if sentences and len(sentences[0]) > 20:
                    summary_sentences.append(sentences[0])

        summary_text = " ".join(summary_sentences[:4])
        if not summary_text:
            summary_text = f"File contains {len(lines)} lines of structured text/code."

        return {
            "success": True,
            "path": rel_path,
            "summary": summary_text,
            "headings": headings[:8],
            "total_lines": len(lines),
            "total_size": read_res["size_bytes"]
        }

    def search_files(self, keyword: str, max_results: int = 25) -> List[Dict[str, Any]]:
        """Fast keyword search across files in the workspace."""
        results = []
        kw = keyword.lower()
        exclude = {'.git', 'node_modules', '__pycache__', '.pytest_cache', 'assets'}

        for root, dirs, files in os.walk(self.base_dir):
            dirs[:] = [d for d in dirs if d not in exclude and not d.startswith('.')]
            for f in files:
                if kw in f.lower():
                    full_p = os.path.join(root, f)
                    rel = os.path.relpath(full_p, self.base_dir).replace("\\", "/")
                    results.append({
                        "name": f,
                        "path": rel,
                        "size_bytes": os.path.getsize(full_p),
                        "ext": os.path.splitext(f)[1].lower()
                    })
                    if len(results) >= max_results:
                        return results
        return results

file_service = FileService()
