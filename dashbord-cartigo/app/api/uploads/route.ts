import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND_API_BASE_URL = (
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5001/api"
).replace(/\/+$/, "");

async function parseBackendResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const incomingFormData = await request.formData();
  const file = incomingFormData.get("file");

  if (
    !file ||
    typeof file !== "object" ||
    typeof (file as File).arrayBuffer !== "function"
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Image file is required.",
      },
      { status: 400 }
    );
  }

  const proxiedFormData = new FormData();
  proxiedFormData.append("file", file, file.name);

  for (const fieldName of ["type"]) {
    const value = incomingFormData.get(fieldName);

    if (typeof value === "string" && value.trim().length > 0) {
      proxiedFormData.append(fieldName, value.trim());
    }
  }

  const backendResponse = await fetch(`${BACKEND_API_BASE_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
    },
    body: proxiedFormData,
    cache: "no-store",
  });

  const payload = await parseBackendResponse(backendResponse);

  return NextResponse.json(payload, {
    status: backendResponse.status,
  });
}
