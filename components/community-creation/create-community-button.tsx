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
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
      >
        <PlusCircle className="h-4 w-4" />
        Create
      </button>
      <CreateCommunityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

