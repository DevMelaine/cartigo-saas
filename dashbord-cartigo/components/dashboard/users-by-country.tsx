'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface CountryData {
  country: string
  users: number
  percentage: number
}

interface UsersByCountryProps {
  data: CountryData[]
}

export function UsersByCountry({ data }: UsersByCountryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisateurs par pays</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((country) => (
            <div key={country.country} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{country.country}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {country.users.toLocaleString()}
                  </span>
                  <span className="w-12 text-right text-sm font-semibold text-primary">
                    {country.percentage}%
                  </span>
                </div>
              </div>
              <Progress value={country.percentage} className="h-2.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
