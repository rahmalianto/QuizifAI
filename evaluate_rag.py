import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from datasets import Dataset

# Load variables from .env file
load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================
# Look for standard Vite variables first, fallback to standard names
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Ensure API key is set for Langchain
os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

async def run_evaluation():
    print("1. Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("2. Fetching chat logs...")
    # Fetch sessions and messages to build pairs of queries and answers
    # This logic assumes sequential messages (user then assistant) within a session
    response = supabase.table("chat_messages").select("*").order("created_at").execute()
    messages = response.data

    if not messages:
        print("No chat messages found to evaluate.")
        return

    # Process logs into query-answer pairs
    questions = []
    answers = []
    contexts = []
    
    current_question = None

    for msg in messages:
        if msg["role"] == "user":
            current_question = msg["content"]
        elif msg["role"] == "assistant" and current_question:
            # We found an answer that follows a question
            questions.append(current_question)
            answers.append(msg["content"])
            
            # Extract contexts (chunks of text) from the jsonb column
            used_chunks = msg.get("context_used") or []
            context_strings = [chunk["content"] for chunk in used_chunks if "content" in chunk]
            contexts.append(context_strings)
            
            # Reset for next pair
            current_question = None

    if not questions:
        print("Could not find any complete question-answer pairs.")
        return

    print(f"Found {len(questions)} interactions to evaluate.")
    
    print("3. Building RAGAS Dataset...")
    data = {
        "question": questions,
        "answer": answers,
        "contexts": contexts,
    }
    dataset = Dataset.from_dict(data)

    print("4. Configuring Gemini as Evaluator...")
    # Ragas uses the LLM as a judge to grade the responses
    evaluator_llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro")
    evaluator_embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    print("5. Running RAGAS Evaluation... (this may take a minute)")
    result = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy, context_precision],
        llm=evaluator_llm,
        embeddings=evaluator_embeddings,
    )

    print("\n==========================================")
    print("EVALUATION RESULTS")
    print("==========================================")
    print(result)
    
    # You can also export the detailed results to a pandas dataframe
    # df = result.to_pandas()
    # df.to_csv("rag_evaluation_report.csv", index=False)
    # print("Saved detailed report to rag_evaluation_report.csv")

if __name__ == "__main__":
    asyncio.run(run_evaluation())
