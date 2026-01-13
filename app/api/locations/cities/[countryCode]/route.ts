import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ countryCode: string }> }
) {
  try {
    const { countryCode } = await params
    const apiKey = process.env.COUNTRY_STATE_CITY_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    if (!countryCode) {
      return NextResponse.json({ error: "Country code is required" }, { status: 400 })
    }

    const response = await fetch(
      `https://api.countrystatecity.in/v1/countries/${countryCode}/cities`,
      {
        headers: {
          "X-CSCAPI-KEY": apiKey
        },
        next: { revalidate: 86400 } // Cache for 24 hours
      }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch cities")
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching cities:", error)
    return NextResponse.json({ error: "Failed to fetch cities" }, { status: 500 })
  }
}
