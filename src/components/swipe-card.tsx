"use client"

import { useState, useRef } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { Heart, X } from "lucide-react"

interface SwipeCardProps {
  profile: {
    id: number
    name: string
    age: number
    city: string
    bio: string
  }
  onSwipe: (direction: "left" | "right") => void
}

export function SwipeCard({ profile, onSwipe }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-20, 20])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])

  const cardRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = () => {
    if (x.get() > 100) {
      setExitX(200)
      onSwipe("right")
    } else if (x.get() < -100) {
      setExitX(-200)
      onSwipe("left")
    }
  }

  const likeOpacity = useTransform(x, [0, 100], [0, 1])
  const dislikeOpacity = useTransform(x, [-100, 0], [1, 0])

  return (
    <motion.div
      ref={cardRef}
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={{ x: exitX }}
      className="absolute inset-0 bg-black flex flex-col justify-end p-6 cursor-grab active:cursor-grabbing"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div style={{ opacity: likeOpacity }} className="bg-emerald-500/30 p-4 rounded-full">
          <Heart className="h-16 w-16 text-emerald-500" />
        </motion.div>
        <motion.div style={{ opacity: dislikeOpacity }} className="bg-red-500/30 p-4 rounded-full">
          <X className="h-16 w-16 text-red-500" />
        </motion.div>
      </div>

      <h2 className="text-emerald-400 text-3xl">
        {profile.name}, {profile.age}
      </h2>
      <p className="text-emerald-400">{profile.city}</p>
      <p className="text-emerald-400 mt-2">{profile.bio}</p>
    </motion.div>
  )
}

