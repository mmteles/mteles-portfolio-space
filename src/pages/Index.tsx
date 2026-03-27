import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import BioSection from "@/components/home/BioSection";
import TimelineSection from "@/components/home/TimelineSection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <BioSection />
      <TimelineSection />
    </Layout>
  );
};

export default Index;
