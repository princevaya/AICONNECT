"use client";
import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HERO, MISSION, VISION, CORE_VALUES, CTA } from "@/constants/about";

function AboutHeroSection() {
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, 100]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-background flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 10 }}
        transition={{ duration: 0.8 }}
        style={{ y }}
        className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
      >
        <motion.h1
          className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-foreground"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          {HERO.title}
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {HERO.subtitle}
        </motion.p>

        <motion.div
          className="flex justify-center mt-12"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          <ChevronDown className="w-8 h-8 text-primary" />
        </motion.div>
      </motion.div>
    </section>
  );
}
function AboutMissionSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0.5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

  return (
    <section
      ref={ref}
      className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-background"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          style={{ opacity, scale }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-foreground">
              {MISSION.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {MISSION.description}
            </p>

            <div className="space-y-4">
              {MISSION.features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex gap-4">
                    <Icon className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative h-96 rounded-2xl overflow-hidden"
          >
            <div className="w-full h-full bg-card border border-border rounded-2xl flex items-center justify-center">
              <p className="text-muted-foreground">Mission Image</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function AboutVisionSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0.5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

  return (
    <section
      ref={ref}
      className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-card/30"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          style={{ opacity, scale }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative h-96 rounded-2xl overflow-hidden order-2 lg:order-1"
          >
            <div className="w-full h-full bg-card border border-border rounded-2xl flex items-center justify-center">
              <p className="text-muted-foreground">Vision Image</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-foreground">
              {VISION.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {VISION.description}
            </p>

            <div className="space-y-4">
              {VISION.features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex gap-4">
                    <Icon className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function AboutCoreValuesSection() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
            Our Core Values
          </h2>
          <p className="text-lg text-muted-foreground">
            Principles that guide everything we do
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CORE_VALUES.map((value, index) => {
            const Icon = value.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-primary rounded-xl blur-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <Card className="relative border border-border bg-card backdrop-blur-md p-6 h-full hover:border-primary/50 transition-colors">
                  <div className="inline-flex p-3 rounded-lg bg-secondary mb-4">
                    <Icon className="w-6 h-6 text-primary mr-3" />
                    <h3 className="text-xl font-semibold text-foreground">
                      {value.title}
                    </h3>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-card/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Have questions? We&apos;re here to help.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
          className="bg-card border border-border rounded-2xl p-8 backdrop-blur-md"
        >
          <p className="text-muted-foreground mb-6">
            Have more questions? Visit our complete FAQ page for detailed
            answers and support resources.
          </p>

          <Link href="/faq">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 rounded-full inline-flex items-center gap-2">
                View Full FAQ <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-background" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            {CTA.heading}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-12 leading-relaxed">
            {CTA.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 rounded-full shadow-lg transition-all duration-300"
              >
                {CTA.primaryButtonText}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                className="border-border text-foreground hover:bg-secondary backdrop-blur-md font-semibold px-8 rounded-full transition-all duration-300 bg-transparent"
              >
                {CTA.secondaryButtonText}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      <AboutHeroSection />
      <AboutMissionSection />
      <AboutVisionSection />
      <AboutCoreValuesSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}
