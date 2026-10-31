<div align="center">

# Wanderwing: Multi-Agent AI Travel Planner

**Describe your trip in one message. A crew of AI agents finds flights, hotels and writes your day-by-day itinerary.**

[**🌍 LIVE WORKING WEBSITE**](https://multi-agent-travel-planner-m4rc.onrender.com)

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-multi--agent-1C3C3C)
![Groq](https://img.shields.io/badge/LLM-Groq-F55036)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7)

</div>


---

## Overview

Planning a trip usually means juggling flight sites, hotel searches and spreadsheets. Wanderwing replaces that with one natural-language request, for example:

> *"Plan a 7-day Japan trip from Mumbai with flights, hotels and sightseeing under ₹2 lakh."*

A **LangGraph** workflow passes the request through four specialised agents. Each one adds its part to a shared state, and the final agent turns it all into a clear, structured plan.

## Features

- **Multi-agent pipeline:** separate flight, hotel, itinerary and final-review agents orchestrated by LangGraph.
- **Live flight data** from the AviationStack API.
- **Hotel research** through Tavily web search.
- **Day-by-day itineraries** with a budget estimate and travel tips.
- **Persistent agent state** stored in PostgreSQL through the LangGraph checkpointer.
- **Modern light-themed web UI:** trip-finder form, animated loading screen, destination marquee, parallax hero, visual result cards, timeline itinerary, and confetti when your plan is ready.
- **Recent trips** saved in the browser, plus Copy, Share and **Download as PDF**.
- **Optional tracing** with LangSmith.
- **Dockerised**, and deployed on Render.

## How it works

```mermaid
flowchart LR
    U([User request]) --> F[Flight agent]
    F --> H[Hotel agent]
    H --> I[Itinerary agent]
    I --> R[Final agent]
    R --> A([Structured travel plan])
    F -. AviationStack .-> X1[(Flight data)]
    H -. Tavily .-> X2[(Hotel results)]
    R -. checkpoints .-> DB[(PostgreSQL)]
```

| Agent | Responsibility |
|---|---|
| **Flight agent** | Extracts the route and fetches live flight data for it |
| **Hotel agent** | Searches the web for stays that fit the destination and budget |
| **Itinerary agent** | Builds a practical day-by-day schedule from the earlier results |
| **Final agent** | Combines everything into a summary, flights, hotels, itinerary, budget estimate and recommendations |

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| Agent orchestration | LangGraph, LangChain |
| LLM | Groq (`openai/gpt-oss-120b`) through `langchain-groq` |
| Search and data | Tavily (hotels), AviationStack (flights) |
| Storage | PostgreSQL with `langgraph-checkpoint-postgres` and `psycopg` |
| Frontend | HTML, CSS and vanilla JavaScript (Jinja2 template), `marked`, `DOMPurify`, `html2pdf.js` |
| Deployment | Docker, Render |

## Project structure

```text
Multi-Agent-Travel-Planner/
├── app.py              # FastAPI app: routes, request validation
├── backend.py          # LangGraph workflow and agent definitions
├── tools/
│   ├── flight_tool.py  # AviationStack integration
│   └── tavily_tool.py  # Tavily hotel search
├── templates/
│   └── index.html      # Web UI
├── static/
│   ├── style.css
│   ├── script.js
│   └── img/            # Optional destination photos (tokyo.jpg, paris.jpg, ...)
├── Dockerfile
├── requirements.txt
└── README.md
```

## Getting started

### Prerequisites

- Python 3.11+
- A PostgreSQL database (local, or a hosted one such as Render Postgres or Neon)
- API keys for [Groq](https://console.groq.com), [Tavily](https://tavily.com) and [AviationStack](https://aviationstack.com)

### 1. Clone and install (Windows PowerShell)

```powershell
git clone https://github.com/Nisha-Lohar04/Multi-Agent-Travel-Planner.git
cd Multi-Agent-Travel-Planner
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

On macOS or Linux, activate with `source venv/bin/activate` instead.

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_key
TAVILY_API_KEY=your_tavily_key
AVIATIONSTACK_API_KEY=your_aviationstack_key
DATABASE_URL=postgresql://user:password@host:5432/dbname
DEFAULT_ORIGIN_IATA=BOM

# Optional: LangSmith tracing
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=your_langsmith_key
LANGSMITH_PROJECT=multi-agent-travel-planner
```

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for the LLM |
| `TAVILY_API_KEY` | Yes | Tavily key for hotel search |
| `AVIATIONSTACK_API_KEY` | Yes | AviationStack key for flight data |
| `DATABASE_URL` | Yes | PostgreSQL connection string for agent checkpoints |
| `DEFAULT_ORIGIN_IATA` | No | Fallback departure airport code when none is given in the request |
| `LANGSMITH_*` | No | Enable LangSmith tracing |


### 3. Run locally

```powershell
uvicorn app:app --reload
```

Open <http://127.0.0.1:8000>.

### Run with Docker

```powershell
docker build -t wanderwing .
docker run --env-file .env -p 8000:8000 wanderwing
```

## API reference

### `POST /api/travel`

Generate a travel plan.

**Request**

```json
{
  "message": "Plan a 5-day Dubai trip from Mumbai with flights, hotels and sightseeing",
  "thread_id": null
}
```

**Response**

```json
{
  "success": true,
  "answer": "## Trip Summary ...",
  "thread_id": "user_...",
  "llm_calls": 4
}
```

`answer` is Markdown. `thread_id` identifies the saved agent run; pass `null` to start a fresh one.

### `GET /health`

Returns a simple status response, useful for uptime checks.

### `GET /`

Serves the web interface.

## Deploying to Render

1. Push the repository to GitHub.
2. In Render, create a **New → Web Service** and connect the repo (environment: **Docker**).
3. Add every variable from the table above under **Environment**.
4. Set the start command to use Render's port:
   ```text
   sh -c "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"
   ```
5. Deploy. Render rebuilds automatically on every push.

Make sure `.env` is listed in `.dockerignore` so secrets are never baked into the image.

## Limitations

- Flight results come from AviationStack's flight data and are **not live fares or bookings**. Always check prices and availability with the airline before you book.
- Hotel suggestions come from web search and LLM summarisation, so verify prices and availability before booking.
- The free-tier Render instance sleeps when idle, and a plan takes several seconds to generate because four agents run in sequence.
- Output quality depends on the LLM and on how clearly the request is written.

## Roadmap

- Stream agent progress to the UI in real time (SSE)
- Connection pooling for PostgreSQL under concurrent users
- Rate limiting and request-size limits on the API
- Destination photos and an interactive route map
- Currency conversion and a more detailed budget breakdown
- Saved trips and user accounts

## Contributing

Contributions are welcome. Fork the repo, create a feature branch, and open a pull request describing your change.

