"""Groq LLM integration for medical RAG

Uses Groq API for fast LLM inference with structured JSON output.
Provides medical-aware prompt engineering and fallback handling.
"""
import logging
import json
import asyncio
from typing import Dict, List, Optional, Tuple, AsyncGenerator
from datetime import datetime
import time

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from core.config import (
    GROQ_API_KEY,
    LLM_MODEL_RAG,
    LLM_MAX_TOKENS,
    LLM_TEMPERATURE,
    LLM_TIMEOUT_SECONDS,
)

logger = logging.getLogger(__name__)


class LLMResponse:
    """Structured LLM response"""
    
    def __init__(
        self,
        answer: str,
        citations: List[Dict],
        confidence: float,
        tokens_used: int,
        model: str,
        processing_time_ms: int,
    ):
        self.answer = answer
        self.citations = citations
        self.confidence = confidence
        self.tokens_used = tokens_used
        self.model = model
        self.processing_time_ms = processing_time_ms
    
    def to_dict(self) -> Dict:
        return {
            "answer": self.answer,
            "citations": self.citations,
            "confidence": round(self.confidence, 3),
            "tokens_used": self.tokens_used,
            "model": self.model,
            "processing_time_ms": self.processing_time_ms,
        }


class GroqLLMService:
    """
    Groq LLM service for medical RAG.
    
    Features:
    - Medical-aware prompt engineering
    - Structured JSON output
    - Graceful fallback on failures
    - Token tracking for cost optimization
    """
    
    def __init__(
        self,
        api_key: str = GROQ_API_KEY,
        model: str = LLM_MODEL_RAG,
        max_tokens: int = LLM_MAX_TOKENS,
        temperature: float = LLM_TEMPERATURE,
        timeout: int = LLM_TIMEOUT_SECONDS,
    ):
        """Initialize Groq LLM service"""
        if not api_key:
            raise ValueError("GROQ_API_KEY is required")
        
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.timeout = timeout
        
        try:
            self.llm = ChatGroq(
                api_key=api_key,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            logger.info(f"✅ Initialized Groq LLM: {model}")
        except Exception as e:
            logger.error(f"Failed to initialize Groq: {e}")
            raise
    
    async def generate_response(
        self,
        query: str,
        context_chunks: List[Dict],
        patient_info: Optional[Dict] = None,
    ) -> LLMResponse:
        """
        Generate medical response from retrieved chunks.
        
        Args:
            query: User's question
            context_chunks: Retrieved chunks with citations
            patient_info: Optional patient demographic info
            
        Returns:
            LLMResponse with answer and citations
        """
        import time
        start_time = time.time()
        
        logger.info(f"Generating response for query: {query[:50]}...")
        
        try:
            # Build context string
            context = self._build_context(context_chunks)
            
            # Build medical prompt
            prompt = self._build_medical_prompt(query, context, patient_info)
            
            # Call LLM with timeout
            loop = asyncio.get_event_loop()
            response_text = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self._call_llm(prompt),
                ),
                timeout=self.timeout
            )
            
            # Parse structured response
            parsed = self._parse_response(response_text, context_chunks)
            
            # Build citations
            citations = self._extract_citations(context_chunks, parsed)
            
            # Calculate confidence
            confidence = self._calculate_confidence(context_chunks, parsed)
            
            # Estimate tokens
            tokens_used = self._estimate_tokens(prompt + response_text)
            
            processing_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"✅ Generated response (confidence: {confidence:.2f}, {tokens_used} tokens)")
            
            return LLMResponse(
                answer=parsed.get("answer", ""),
                citations=citations,
                confidence=confidence,
                tokens_used=tokens_used,
                model=self.model,
                processing_time_ms=processing_time,
            )
            
        except asyncio.TimeoutError:
            logger.error("LLM request timed out")
            return await self.generate_fallback_response(query, context_chunks)
        except Exception as e:
            logger.error(f"LLM error: {str(e)}", exc_info=True)
            return await self.generate_fallback_response(query, context_chunks)
    
    async def stream_response(
        self,
        query: str,
        context_chunks: List[Dict],
        patient_info: Optional[Dict] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream tokens from LLM for real-time UI updates.
        
        Yields JSON-formatted chunks with token data.
        
        Args:
            query: User's question
            context_chunks: Retrieved chunks with citations
            patient_info: Optional patient demographic info
            
        Yields:
            JSON strings: {"token": "text", "type": "token"|"citations"|"metadata"}
        """
        start_time = time.time()
        
        logger.info(f"Streaming response for query: {query[:50]}...")
        
        try:
            # Build context and prompt
            context = self._build_context(context_chunks)
            prompt = self._build_medical_prompt(query, context, patient_info)
            
            # Collect citations upfront
            citations = self._extract_citations(context_chunks, {})
            
            # Send metadata event
            metadata = {
                "type": "metadata",
                "citations": citations,
                "retrieval_count": len(context_chunks),
            }
            yield json.dumps(metadata) + "\n"
            
            # Create streaming LLM
            streaming_llm = ChatGroq(
                api_key=self.api_key,
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                streaming=True,
            )
            
            # Call LLM with streaming
            messages = [
                SystemMessage(content="You are a medical documentation AI."),
                HumanMessage(content=prompt),
            ]
            
            full_response = ""
            loop = asyncio.get_event_loop()
            
            # Stream from LLM
            for chunk in await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: streaming_llm.stream(messages),
                ),
                timeout=self.timeout
            ):
                token_text = chunk.content if hasattr(chunk, 'content') else str(chunk)
                full_response += token_text
                
                # Send token to client
                token_event = {
                    "type": "token",
                    "token": token_text,
                }
                yield json.dumps(token_event) + "\n"
            
            # Parse and send final response
            parsed = self._parse_response(full_response, context_chunks)
            confidence = self._calculate_confidence(context_chunks, parsed)
            tokens_used = self._estimate_tokens(prompt + full_response)
            processing_time = int((time.time() - start_time) * 1000)
            
            # Send completion event with metadata
            completion = {
                "type": "completion",
                "answer": parsed.get("answer", full_response),
                "confidence": round(confidence, 3),
                "tokens_used": tokens_used,
                "processing_time_ms": processing_time,
            }
            yield json.dumps(completion) + "\n"
            
            logger.info(f"✅ Streamed response (confidence: {confidence:.2f})")
            
        except asyncio.TimeoutError:
            logger.error("Streaming request timed out")
            error_event = {
                "type": "error",
                "error": "Request timed out",
                "message": "The response generation took too long. Please try again.",
            }
            yield json.dumps(error_event) + "\n"
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}", exc_info=True)
            error_event = {
                "type": "error",
                "error": str(type(e).__name__),
                "message": f"Failed to generate streaming response: {str(e)[:100]}",
            }
            yield json.dumps(error_event) + "\n"
    
    def _build_context(self, chunks: List[Dict]) -> str:
        """Build context string from chunks"""
        context_parts = []
        
        for i, chunk in enumerate(chunks, 1):
            section = chunk.get("section", "unknown").replace("_", " ").title()
            text = chunk.get("text", "")
            note_id = chunk.get("note_id", "")
            timestamp = chunk.get("timestamp", "")
            
            context_parts.append(
                f"[{i}] **{section}** (ID: {note_id}, {timestamp}):\n{text}"
            )
        
        return "\n\n".join(context_parts)
    
    def _build_medical_prompt(
        self,
        query: str,
        context: str,
        patient_info: Optional[Dict],
    ) -> str:
        """Build medical-aware prompt with safety guardrails"""
        system_prompt = """You are an expert medical AI assistant helping doctors and patients 
understand clinical information. You MUST:

1. ONLY answer based on the provided context
2. If information is not in context, clearly state "Not found in medical records"
3. Include citations for every claim
4. Use clear, professional medical language
5. NEVER hallucinate or add external knowledge
6. NEVER provide medical advice, only summarize records
7. Flag any contradictions in the records

Provide response in VALID JSON format:
{
  "answer": "Clear summary based only on context",
  "confidence": 0.0-1.0,
  "notes": "Any important caveats or disclaimers"
}"""
        
        patient_context = ""
        if patient_info:
            patient_context = f"\nPatient info: {json.dumps(patient_info)}"
        
        user_message = f"""Medical Query: {query}{patient_context}

CLINICAL CONTEXT (from medical records):
{context}

Please provide a structured response based ONLY on the above context."""
        
        return f"{system_prompt}\n\nUSER:\n{user_message}"
    
    def _call_llm(self, prompt: str) -> str:
        """Call LLM synchronously"""
        messages = [
            SystemMessage(content="You are a medical documentation AI."),
            HumanMessage(content=prompt),
        ]
        
        response = self.llm.invoke(messages)
        return response.content
    
    def _parse_response(self, response_text: str, context_chunks: List[Dict]) -> Dict:
        """Parse structured response from LLM"""
        try:
            # Try to extract JSON
            json_match = response_text.find("{")
            if json_match != -1:
                json_str = response_text[json_match:]
                # Find matching closing brace
                brace_count = 0
                for i, char in enumerate(json_str):
                    if char == "{":
                        brace_count += 1
                    elif char == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            json_str = json_str[:i+1]
                            break
                
                parsed = json.loads(json_str)
                return parsed
        except Exception as e:
            logger.warning(f"Failed to parse JSON: {e}")
        
        # Fallback: wrap response
        return {
            "answer": response_text[:500],
            "confidence": 0.5,
        }
    
    def _extract_citations(self, chunks: List[Dict], response: Dict) -> List[Dict]:
        """Extract citations from context chunks"""
        citations = []
        
        for chunk in chunks[:3]:  # Top 3 chunks as citations
            citations.append({
                "chunk_id": chunk.get("chunk_id") or chunk.get("id"),
                "note_id": chunk.get("note_id"),
                "section": chunk.get("section"),
                "timestamp": chunk.get("timestamp"),
                "score": chunk.get("reranking_score", chunk.get("final_score", 0.0)),
            })
        
        return citations
    
    def _calculate_confidence(self, chunks: List[Dict], response: Dict) -> float:
        """Calculate confidence score heuristically"""
        # Confidence = avg of (retrieval scores) * response confidence
        retrieval_confidence = sum(
            c.get("reranking_score", c.get("final_score", 0.5)) for c in chunks
        ) / max(1, len(chunks))
        
        response_confidence = response.get("confidence", 0.5)
        
        # Weighted average
        return (retrieval_confidence * 0.6 + response_confidence * 0.4)
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token)"""
        return len(text) // 4
    
    async def generate_fallback_response(
        self,
        query: str,
        chunks: List[Dict],
    ) -> LLMResponse:
        """
        Fallback response when LLM fails.
        
        Returns raw chunks with disclaimer.
        """
        logger.warning("Using fallback response (LLM unavailable)")
        
        fallback_answer = (
            "⚠️ Medical AI assistant temporarily unavailable. \n\n"
            "Here are the matching medical records:\n\n"
        )
        
        for i, chunk in enumerate(chunks[:5], 1):
            fallback_answer += f"[{i}] {chunk.get('section', 'Section').title()}:\n"
            fallback_answer += f"{chunk.get('text', '')[:200]}...\n\n"
        
        citations = self._extract_citations(chunks, {})
        
        return LLMResponse(
            answer=fallback_answer,
            citations=citations,
            confidence=0.4,  # Lower confidence for fallback
            tokens_used=len(fallback_answer) // 4,
            model=f"{self.model} (fallback)",
            processing_time_ms=0,
        )


# Singleton instance
_llm_service: Optional[GroqLLMService] = None


def get_llm_service() -> GroqLLMService:
    """Get or create LLM service singleton"""
    global _llm_service
    if _llm_service is None:
        _llm_service = GroqLLMService()
    return _llm_service


async def generate_response(
    query: str,
    context_chunks: List[Dict],
    patient_info: Optional[Dict] = None,
) -> LLMResponse:
    """Convenience function to generate response"""
    service = get_llm_service()
    return await service.generate_response(query, context_chunks, patient_info)


async def stream_response(
    query: str,
    context_chunks: List[Dict],
    patient_info: Optional[Dict] = None,
) -> AsyncGenerator[str, None]:
    """Convenience function for streaming response"""
    service = get_llm_service()
    async for chunk in service.stream_response(query, context_chunks, patient_info):
        yield chunk
