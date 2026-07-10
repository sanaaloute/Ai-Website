"""Visualize the LoveCode LangGraph agentic system graph.

Usage:
    python show_agent_graph.py

Outputs:
    - Console ASCII art diagram
    - lovecode_agent_graph.mmd (Mermaid source)
    - lovecode_agent_graph.png (PNG diagram)
"""

import asyncio
import os
import sys

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set dummy env vars so settings load without real secrets
os.environ.setdefault("AI_BASE_URL", "http://localhost:8000")
os.environ.setdefault("AI_API_KEY", "dummy")
os.environ.setdefault("E2B_API_KEY", "dummy")
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_ANON_KEY", "dummy")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "dummy")


async def main():
    from app.agents.graph import build_agent_graph

    graph = build_agent_graph()
    drawable = graph.get_graph()

    print("=" * 80)
    print("LOVECODE AGENTIC SYSTEM GRAPH — ASCII")
    print("=" * 80)
    drawable.print_ascii()

    print("\n" + "=" * 80)
    print("LOVECODE AGENTIC SYSTEM GRAPH — MERMAID")
    print("=" * 80)
    mermaid = drawable.draw_mermaid()
    print(mermaid)

    # Save Mermaid source
    with open("lovecode_agent_graph.mmd", "w") as f:
        f.write(mermaid)
    print("\n[Saved] lovecode_agent_graph.mmd")

    # Try PNG output
    try:
        png_bytes = drawable.draw_mermaid_png()
        with open("lovecode_agent_graph.png", "wb") as f:
            f.write(png_bytes)
        print("[Saved] lovecode_agent_graph.png")
    except Exception as e:
        print(f"[PNG skipped] {e}")
        print("You can render lovecode_agent_graph.mmd in any Mermaid viewer.")

    # Print structured summary
    print("\n" + "=" * 80)
    print("REGISTERED NODES")
    print("=" * 80)
    for name in sorted(drawable.nodes.keys()):
        print(f"  • {name}")

    print("\n" + "=" * 80)
    print("WORKFLOW PATHS SUMMARY")
    print("=" * 80)
    print("""
new_app:
  START → coordinator → analyzer → template_selector → planner
        → pre_flight_validator ─┬─[valid]→ executor → file_state_tracker → reviewer
                                └─[invalid]→ planner (replan)
        → reviewer ─┬─[passed]→ finalize → END
                    ├─[failed, retry<3]→ increment_retry → executor (loop)
                    └─[failed, retry>=3]→ finalize → END

edit:
  START → coordinator → analyzer → planner
        → pre_flight_validator ─┬─[valid]→ executor → file_state_tracker → reviewer
                                └─[invalid]→ planner (replan)
        → reviewer ─┬─[passed]→ finalize → END
                    ├─[failed, retry<3]→ increment_retry → executor (loop)
                    └─[failed, retry>=3]→ finalize → END

debug:
  START → coordinator → analyzer → planner → debugger
        → debugger ─┬─[fixed]→ reviewer → finalize → END
                    └─[not fixed]→ executor → file_state_tracker → reviewer → finalize → END

chat:
  START → coordinator → analyzer → answer_generator → finalize → END

clarification:
  START → coordinator → analyzer → finalize → END
""")


if __name__ == "__main__":
    asyncio.run(main())
