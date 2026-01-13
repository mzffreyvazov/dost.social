import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.COUNTRY_STATE_CITY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const response = await fetch("https://api.countrystatecity.in/v1/countries", {
      headers: {
        "X-CSCAPI-KEY": apiKey
      },
      next: { revalidate: 86400 } // Cache for 24 hours since country data rarely changes
    })

    if (!response.ok) {
      throw new Error("Failed to fetch countries")
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching countries:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 })
  }
}
