'use client'
import { connectWs } from "@/ws/main";
import { useEffect } from "react";


export default function Home() {

  useEffect(() => {
    connectWs()
    
  }, [])
  

  return (
    <div>
      <button></button>
    </div>
  );
}
