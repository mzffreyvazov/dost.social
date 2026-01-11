"use client"

import { useState } from "react"
import { PlusCircle } from "lucide-react"
import { CreateCommunityModal } from "@/components/community-creation/create-community-modal"

export function CreateCommunityButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)} 
        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer leading-none"
      >
        <PlusCircle className="h-4 w-4 flex-shrink-0" />
        <span className="leading-none">Create</span>
      </button>
      <CreateCommunityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

