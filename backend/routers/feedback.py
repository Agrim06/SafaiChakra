from fastapi import APIRouter, Request

router = APIRouter(tags=["feedback"])


@router.get("/feedback")
def feedback(bin_id: str):
    print(f"Feedback received for bin {bin_id}")
    return {"message": f"Feedback sent for bin {bin_id}"}
