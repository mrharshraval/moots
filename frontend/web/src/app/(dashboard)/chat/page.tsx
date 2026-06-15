"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Globe, Tag, Sparkles, AlertCircle, ArrowRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NativeSelect } from "@/components/ui/native-select"

export default function ChatConfiguratorPage() {
  const router = useRouter()
  
  // State for interest tags
  const [interestInput, setInterestInput] = React.useState("")
  const [interests, setInterests] = React.useState<string[]>(["gaming", "music", "movies"])

  // State for language and country
  const [language, setLanguage] = React.useState("en")
  const [country, setCountry] = React.useState("global")

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault()
    const tag = interestInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    if (tag && !interests.includes(tag)) {
      setInterests([...interests, tag])
      setInterestInput("")
    }
  }

  const handleRemoveInterest = (tagToRemove: string) => {
    setInterests(interests.filter((t) => t !== tagToRemove))
  }

  const handleStartMatching = () => {
    // Generate query params for matchmaking filters
    const params = new URLSearchParams()
    if (interests.length > 0) params.append("interests", interests.join(","))
    params.append("lang", language)
    params.append("country", country)
    
    router.push(`/chat/waiting?${params.toString()}`)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-background">
      <Card className="w-full max-w-lg border-border bg-card shadow-lg">
        <CardHeader className="text-center pb-4">
          <Badge variant="secondary" className="mx-auto mb-2 text-[9px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            <Sparkles className="h-3 w-3 mr-1" /> Quick Setup
          </Badge>
          <CardTitle className="text-xl font-bold tracking-tight">Match Preferences</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Choose filters to match with strangers who share your topics or language.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="interests" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 border border-border/50 rounded-lg p-1">
              <TabsTrigger value="interests" className="text-xs rounded-md">Interests</TabsTrigger>
              <TabsTrigger value="filters" className="text-xs rounded-md">Language & Region</TabsTrigger>
            </TabsList>
            
            {/* Interests Content */}
            <TabsContent value="interests" className="space-y-4 mt-4 outline-none">
              <form onSubmit={handleAddInterest} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Add interest tag (e.g. anime, coding)"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    className="pl-9 text-xs h-9 border-input"
                  />
                </div>
                <Button type="submit" size="sm" className="text-xs h-9">
                  Add
                </Button>
              </form>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Active Tags</span>
                {interests.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 border border-dashed border-border/60 rounded-lg text-center bg-muted/10">
                    No active tags. Matching will be fully random.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-3 border border-border rounded-lg bg-muted/10">
                    {interests.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] flex items-center gap-1 pl-2 pr-1.5 py-0.5 bg-secondary text-secondary-foreground hover:bg-secondary">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(tag)}
                          className="text-muted-foreground hover:text-foreground shrink-0 rounded-full hover:bg-accent p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Filters Content */}
            <TabsContent value="filters" className="space-y-4 mt-4 outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="language" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    My Language
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                    <NativeSelect
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="pl-9 text-xs h-9"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="zh">中文 (Mandarin)</option>
                    </NativeSelect>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="region" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Preferred Region
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                    <NativeSelect
                      id="region"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="pl-9 text-xs h-9"
                    >
                      <option value="global">Global Matching</option>
                      <option value="na">North America</option>
                      <option value="eu">Europe</option>
                      <option value="as">Asia</option>
                      <option value="sa">South America</option>
                    </NativeSelect>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-start gap-2 bg-muted/40 p-3 rounded-lg border border-border/40 text-[10px] text-muted-foreground leading-normal">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              OpenChat matches instantly. Leaving fields default will pair you with the first available stranger globally.
            </p>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button onClick={handleStartMatching} className="w-full h-11 text-xs font-semibold flex items-center justify-center gap-2">
            START MATCHMAKING
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
