import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";

export default function BioSection() {
  const { data: profile } = useProfile();

  return (
    <section id="about" className="py-20 bg-background border-t border-border">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-600 dark:text-indigo-400 mb-5">
            About
          </p>
          <p className="text-xl md:text-2xl font-light text-foreground leading-relaxed whitespace-pre-line">
            {profile?.bio ||
              "A seasoned technology professional with over 15 years of experience in consulting and project management. Passionate about developing people and processes while leveraging AI and full-stack development to deliver intelligent solutions for complex business challenges."}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
