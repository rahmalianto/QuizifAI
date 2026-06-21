Comprehensive System Architecture, Workflow, and Phased Implementation Plan

This document establishes a complete technical and operational framework for building a smart, adaptive quiz application designed to convert course materials and articles into manageable study units. The blueprint is structured specifically to serve as an exact, comprehensive implementation prompt for advanced AI generation systems like Claude.

1. System Workflow & Data Lifecycle Blueprint[Raw Text / Notes] ──> [Gemini 2.5 Flash API] ──> [JSON Schema Validation]
                                                           │
                                                           ▼
[Local Room DB (Cache)] <── [Manual Edit / Review Screen] ──> [User Confirms Save]
         │
         ├─── [Background Sync Worker] ──> [Supabase Remote DB (RLS Enabled)]
         │
         ▼
[Adaptive Weight Selection Engine] ──> [Dynamic Input UI (Compose)] ──> [Instant Score & Material Ref]


1. Core Execution Flow
1.1. Ingestion & AI Generation: The user imports raw markdown text or course notes. The app passes this text securely to the AI processing layer, which extracts concepts and returns an array of structured questions matching the required formats. The user previews, alters, and confirms the items.
1.2. Session Configuration & Filtering: The user selects active target categories, specific tags, and allowed UI interaction types (e.g., checkboxes and short answers only).
1.3. Adaptive Weight Calculations: The engine builds a localized priority queue by applying the selection algorithm across the filtered dataset, bringing high-priority and weak items to the front.
1.4. Session Runtime & Immediate Review: The interface renders the exact question components dynamically. Submitting an answer instantly tallies scores, updates historical performance statistics, and renders the exact course material citation at the bottom of the screen.
1.5. Atomic Cloud Sync: Local data modifications trigger an immediate background worker to replicate changes up to the remote database via a secure REST/GraphQL API.


2. Low-Cost, Production-Grade Tech Stack
Optimized to run entirely within free operational tiers, this stack eliminates ongoing hosting liabilities while ensuring offline-first performance.
2.1. Frontend Mobile Client: Android Native using Kotlin and Jetpack Compose. Rationale: $0 toolchain cost with native Material 3 design support. Jetpack Compose provides state-driven UI layouts perfect for handling dynamic question formats seamlessly.
2.2. Local Cache Storage: Architecture Components using Room Database. Rationale: Native SQLite wrapper. Serves as the single source of truth for offline execution, instant local querying, and robust data caching.
2.3. Backend & Cloud Database: Supabase (PostgreSQL + PostgREST). Rationale: Free Tier includes a 500MB DB storage allowance and up to 50,000 monthly active users. Provides automated API generation, built-in GoTrue Authentication, and instant real-time data listening tools. Serverless Computing: Supabase Edge Functions (Deno). Rationale: Free Tier includes 500,000 monthly execution calls. Securely manages AI API interactions without exposing private access tokens within the compiled mobile binary.
2.4. AI Inference Engine: Google Gemini API (Gemini 2.5 Flash).Rationale: Free Tier via Google AI Studio offers up to 15 Requests Per Minute (RPM) and 1 million tokens per minute. Provides incredibly fast inference with native structural JSON output formatting.


3. The Custom Adaptive Question Selection AlgorithmTo guarantee optimized memory retention, questions are not picked at random. Instead, the application builds a dynamic priority queue using a custom multi-variable scoring calculation.

The selection priority weight ($W$) for any given question is calculated as:
$$\boxed{W = (1 - S_{norm}) \times \alpha + \left(1 - \frac{C}{A + 1}\right) \times \beta + \ln(T_{delta} + 1) \times \gamma}$$
Variable Dictionary
- $S_{norm}$ (Normalized Score): The current relative difficulty score of the specific question bound between $[0, 1]$. A lower historical score increases priority.
- $C$ (Cumulative Success): Total number of times this question has been answered correctly.
- $A$ (Attempts Counter): Total history of active selection submissions. The ratio $\frac{C}{A+1}$ measures historical precision.
- $T_{delta}$ (Time Delta): The duration in hours since the question was last answered correctly. A larger delta signifies memory decay, raising selection priority.
- $\alpha, \beta, \gamma$ (System Weights): User-controlled variables managed via the settings menu to prioritize low scores, high mistake rates, or time elapsed.

Execution Rule: Newly generated questions with no historical logs possess an undefined $T_{delta}$. The system automatically assigns $T_{delta} = \infty$ to guarantee new questions are prioritized immediately in the next session.

4. Database Schema Structure
4.1. categories Table
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to Supabase Auth)
- name: TEXT
- created_at: TIMESTAMP

4.2. questions Table
- id: UUID (Primary Key)
- category_id: UUID (Foreign Key)
- question_text: TEXT
- question_image_url: TEXT (Nullable)
- answer_type: TEXT (Enum: MULTIPLE_CHOICE, CHECKBOX, SHORT_ANSWER, LONG_ANSWER)
- correct_answers: TEXT (JSON Array storing correct string options or precise text matches)
- incorrect_options: TEXT (JSON Array, Nullable for text answers)
- material_reference: TEXT (The exact structural source phrase or note excerpt)
- current_score: INTEGER (Defaults to 0)
- created_at: TIMESTAMP

4.3. question_tags Table
- question_id: UUID (Foreign Key)
- tag_name: TEXT
- Composite Primary Key (question_id, tag_name)

4.4 session_logs Table
- id: UUID (Primary Key)
- question_id: UUID (Foreign Key)
- is_correct: BOOLEAN
- timestamp: TIMESTAMP5. 

5. Step-by-Step AI Implementation Plan
Provide these exact phase specifications sequentially to Claude to build out the application components.
Phase 1: Local Offline Infrastructure (Data Architecture)
- Goal: Create a robust, testable local Room database wrapper that models the entire operational schema.
- Tasks:
-- Write Kotlin data classes defining database tables (Question, Category, Tag, Log) using Room annotations.
-- Create a QuizDao interface exposing robust queries to pull filtered questions:
Kotlin
@Query("SELECT * FROM questions WHERE category_id IN (:categories) AND answer_type IN (:types)")
fun getFilteredQuestions(categories: List<String>, types: List<String>): List<QuestionWithTags>
  
  3. Write a repository layer to recalculate individual question scores locally whenever a session entry is committed.
* **Verification:** Run local JUnit tests ensuring database reads, score updates, and filtering conditions match exactly.

### Phase 2: Dynamic Layouts & Session Runner UX
* **Goal:** Build the interface components using Jetpack Compose to dynamically render the appropriate UI based on the structural `answer_type`.
* **Tasks:**
  1. Build a stateless screen container containing a flexible quiz card layout.
  2. Use a conditional `when(question.answerType)` block to swap standard input components:
     * `MULTIPLE_CHOICE`: Custom `RadioButton` group.
     * `CHECKBOX`: Stateful `Checkbox` columnar block.
     * `SHORT_ANSWER` / `LONG_ANSWER`: Outlined `TextField` fields with evaluation logic.
  3. Implement the dynamic scoring banners and reveal animation blocks showing the structural `material_reference` right after input validation.
  4. Build a Configuration Screen offering multi-select chips for active tags, categories, and sliders for $\alpha$, $\beta$, and $\gamma$.

### Phase 3: Supabase Authentication & Background Synchronization
* **Goal:** Connect to cloud hosting and implement reliable, automated synchronization scripts.
* **Tasks:**
  1. Initialize the Supabase Android Client containing standard Email/Password authentication patterns.
  2. Implement an Android `WorkManager` background sync service running unique constraints (e.g., network available).
  3. Create a conflict resolution policy inside the repository: Local modifications append an updated timestamp string; sync tasks upload records and download items where `remote.updated_at > local.updated_at`.
* **Verification:** Put the application into flight mode, execute quiz answers, verify local database mutations, restore networking, and watch remote tables populate via the logging dashboard.

### Phase 4: Gemini AI Generation & Analytics Dashboards
* **Goal:** Implement automated question generation and analytics visualization.
* **Tasks:**
  1. Write a secure Supabase Edge Function connecting to `Gemini 2.5 Flash`. Provide a system prompt instructing the model to parse input notes into strict JSON schemas:
     ```json
     {
       "questions": [
         {
           "question_text": "...",
           "answer_type": "MULTIPLE_CHOICE",
           "correct_answers": ["Option A"],
           "incorrect_options": ["B", "C", "D"],
           "material_reference": "Course section 4.2"
         }
       ]
     }

- Build a Review UI screen within the app to dynamically parse this JSON string, letting users review, edit, or delete items before committing them to the local database.
- Design an Analytics Screen using Jetpack Compose custom Canvas objects to draw line charts for historical scores, tracking bars highlighting category weaknesses, and metrics showing time deltas since your last correct answers.
