import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Rocket, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero Section */}
      <section className="text-center py-24 px-4 bg-gradient-to-br from-purple-800 to-purple-900 text-white">
        <motion.h1
          className="text-5xl font-bold mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          J Merrill Publishing, Inc.
        </motion.h1>
        <motion.p
          className="text-xl mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Helping Authors Help Themselves — through innovation, integrity, and a
          collaborative publishing model.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <Button className="text-lg px-6 py-3 rounded-2xl shadow-xl">
            Book a Consultation
          </Button>
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-16 bg-gray-100">
        <Card>
          <CardContent className="p-6 text-center">
            <Rocket className="w-12 h-12 mx-auto mb-4 text-purple-700" />
            <h2 className="text-xl font-semibold mb-2">Blockchain Publishing</h2>
            <p>
              Leading the industry with transparent, tech-forward author royalties.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-purple-700" />
            <h2 className="text-xl font-semibold mb-2">Full-Service Publishing</h2>
            <p>
              From manuscript to marketing—our authors retain 70% royalties across
              all formats.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-purple-700" />
            <h2 className="text-xl font-semibold mb-2">Author Empowerment</h2>
            <p>We don’t just publish books—we build author legacies.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}