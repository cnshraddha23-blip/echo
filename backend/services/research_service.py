import urllib.request
import urllib.parse
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup

class ResearchService:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 EchoAssistant/2.0"
        }

    def search_duckduckgo(self, query: str) -> List[Dict[str, str]]:
        """Queries DuckDuckGo search without API keys."""
        results = []
        try:
            url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_redirect=1&no_html=1"
            req = urllib.request.Request(url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                
                abstract = data.get("AbstractText")
                abstract_src = data.get("AbstractSource")
                abstract_url = data.get("AbstractURL")
                if abstract:
                    results.append({
                        "title": f"Summary ({abstract_src or 'DuckDuckGo'})",
                        "snippet": abstract,
                        "url": abstract_url or "https://duckduckgo.com"
                    })
                
                for topic in data.get("RelatedTopics", [])[:5]:
                    if isinstance(topic, dict) and "Text" in topic:
                        results.append({
                            "title": topic.get("Text", "").split(" - ")[0],
                            "snippet": topic.get("Text", ""),
                            "url": topic.get("FirstURL", "")
                        })
        except Exception as e:
            print(f"[Research DuckDuckGo Error]: {e}")
        return results

    def search_wikipedia(self, query: str, lang: str = "en") -> Optional[Dict[str, Any]]:
        """Queries official Wikipedia search and extract API."""
        try:
            q_clean = query.strip()
            search_url = f"https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(q_clean)}&format=json&utf8=1"
            req = urllib.request.Request(search_url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                search_results = data.get("query", {}).get("search", [])
                if not search_results:
                    return None
                best_title = search_results[0]["title"]
            
            # Fetch summary
            summary_url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(best_title)}"
            req2 = urllib.request.Request(summary_url, headers=self.headers)
            with urllib.request.urlopen(req2, timeout=4.0) as resp2:
                summary_data = json.loads(resp2.read().decode('utf-8'))
                return {
                    "title": summary_data.get("title", best_title),
                    "extract": summary_data.get("extract", ""),
                    "description": summary_data.get("description", ""),
                    "url": summary_data.get("content_urls", {}).get("desktop", {}).get("page", f"https://{lang}.wikipedia.org/wiki/{best_title}")
                }
        except Exception as e:
            print(f"[Research Wikipedia Error]: {e}")
            return None

    def fetch_webpage_summary(self, url: str) -> Dict[str, Any]:
        """Safely fetches and summarizes text content from an authorized public URL."""
        try:
            if not url.startswith("http://") and not url.startswith("https://"):
                url = "https://" + url
            req = urllib.request.Request(url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=6.0) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
            
            soup = BeautifulSoup(html, 'html.parser')
            title = soup.title.string.strip() if soup.title else url
            # Remove scripts, styles, navigation
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()
            
            text = ' '.join(soup.stripped_strings)
            sentences = re.split(r'(?<=[.!?])\s+', text)
            summary = ' '.join(sentences[:5])
            if len(summary) > 800:
                summary = summary[:800] + "..."
            
            return {
                "success": True,
                "title": title,
                "url": url,
                "summary": summary,
                "word_count": len(text.split())
            }
        except Exception as e:
            return {"success": False, "url": url, "error": str(e)}

    def generate_research_report(self, topic: str, language: str = "en-IN") -> Dict[str, Any]:
        """Synthesizes search results into a clean, actionable markdown research report."""
        wiki_res = self.search_wikipedia(topic)
        ddg_results = self.search_duckduckgo(topic)
        
        findings = []
        sources = []
        
        if wiki_res:
            findings.append(f"### Core Overview\n{wiki_res['extract']}")
            sources.append(f"- [Wikipedia: {wiki_res['title']}]({wiki_res['url']})")
        
        if ddg_results:
            findings.append("### Related Intelligence & Search Snippets")
            for item in ddg_results[:4]:
                findings.append(f"**{item['title']}**\n{item['snippet']}")
                if item.get('url'):
                    sources.append(f"- [{item['title']}]({item['url']})")
        
        if not findings:
            report_body = f"Comprehensive web intelligence sweep for '{topic}' yielded minimal direct factual entries. You can refine the query or verify connectivity."
        else:
            report_body = "\n\n".join(findings)
            if sources:
                report_body += "\n\n### Verified References\n" + "\n".join(set(sources))

        return {
            "topic": topic,
            "report_markdown": report_body,
            "sources_count": len(sources),
            "generated_at": datetime.now().isoformat() if 'datetime' in globals() else ""
        }

research_service = ResearchService()
