import Link from "next/link";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Rocket, Users, Megaphone, Star, BadgePercent } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow px-4 py-16 text-gray-900 dark:text-gray-100">
        <section className="text-center max-w-4xl mx-auto mb-16">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Our Publishing Services
          </motion.h1>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            We offer tailored solutions to fit your publishing vision. Explore our core service offerings below.
          </motion.p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Link href="/services/full-service">
            <Card className="hover:shadow-md transition cursor-pointer">
              <CardContent className="p-6 text-center">
                <BookOpen className="w-10 h-10 mx-auto text-[#1E90FF] mb-3" />
                <h3 className="text-xl font-semibold mb-2">Full-Service Publishing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Manuscript to marketplace with editing, design, distribution & more.
                </p>
                <span className="text-[#1E90FF] mt-2 inline-block">Learn More →</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services/blockchain">
            <Card className="hover:shadow-md transition cursor-pointer">
              <CardContent className="p-6 text-center">
                <Rocket className="w-10 h-10 mx-auto text-[#1E90FF] mb-3" />
                <h3 className="text-xl font-semibold mb-2">Blockchain Publishing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Protect your rights, track royalties, and future-proof your work.
                </p>
                <span className="text-[#1E90FF] mt-2 inline-block">Learn More →</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services/audiobook">
            <Card className="hover:shadow-md transition cursor-pointer">
              <CardContent className="p-6 text-center">
                <Users className="w-10 h-10 mx-auto text-[#1E90FF] mb-3" />
                <h3 className="text-xl font-semibold mb-2">Audiobook Production</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Studio-quality audio, global platforms, and pro narration.
                </p>
                <span className="text-[#1E90FF] mt-2 inline-block">Learn More →</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services/branding">
            <Card className="hover:shadow-md transition cursor-pointer">
              <CardContent className="p-6 text-center">
                <Star className="w-10 h-10 mx-auto text-[#1E90FF] mb-3" />
                <h3 className="text-xl font-semibold mb-2">Branding</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Logos, author kits, and brand visuals that leave an impression.
                </p>
                <span className="text-[#1E90FF] mt-2 inline-block">Learn More →</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services/legacy">
            <Card className="hover:shadow-md transition cursor-pointer">
              <CardContent className="p-6 text-center">
                <BadgePercent className="w-10 h-10 mx-auto text-[#1E90FF] mb-3" />
                <h3 className="text-xl font-semibold mb-2">Legacy Projects</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Biographies, memoirs & generational publishing to preserve family history.
                </p>
                <span className="text-[#1E90FF] mt-2 inline-block">Learn More →</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services/marketing">
            <Card className="hover:shadow-md transition cursor-pointer">
              <CardContent className="p-6 text-center">
                <Megaphone className="w-10 h-10 mx-auto text-[#1E90FF] mb-3" />
                <h3 className="text-xl font-semibold mb-2">Marketing & Promotion</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Launch campaigns, platform building, and long-term author marketing.
                </p>
                <span className="text-[#1E90FF] mt-2 inline-block">Learn More →</span>
              </CardContent>
            </Card>
          </Link>
        </section>

        <section className="mt-24 text-center">
          <h2 className="text-2xl font-bold mb-4">Not sure where to start?</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Compare plans and publishing tiers — including our annual subscription model.
          </p>
          <Link href="/pricing" className="bg-[#1E90FF] text-white px-6 py-3 rounded-full hover:bg-blue-700 transition">
            View Pricing & Packages
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
