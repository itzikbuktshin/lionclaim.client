import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle, XCircle, TrendingDown, Calculator, 
  FileText, AlertTriangle, Award, Download, Loader2, DollarSign
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatCurrency, getDeclineRangeLabel, getFixedCostsCoefficient } from "@/lib/compensationCalc";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function ResultRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className={`text-lg font-bold ${highlight ? "text-secondary" : "text-foreground"}`}>
        {value}
      </span>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-sm font-medium">{label}</span>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

export default function ResultCard({ result }) {
  const { eligible, declinePercent, fixedCostsAmount, salaryAmount, totalAmount, annualRevenue, businessType } = result;
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef(null);
  const coefficient = getFixedCostsCoefficient(declinePercent);

  const handleExportPDF = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const margin = 10;
      const maxW = pageW - margin * 2;
      const imgW = maxW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const yPos = imgH < pageH - margin * 2 ? (pageH - imgH) / 2 : margin;
      pdf.addImage(imgData, "PNG", margin, yPos, imgW, imgH);
      pdf.save(`שאגת-הארי-בדיקת-זכאות-${new Date().toLocaleDateString("he-IL").replace(/\//g, "-")}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const requiredDocs = [
    "דוחות מע\"מ לתקופת הבסיס (מרץ-אפריל 2025)",
    "דוחות מע\"מ לתקופת הפיצוי (מרץ-אפריל 2026)",
    "דוחות שכר לשנת 2025",
    "אישור ניהול חשבון בנק",
    "צילום תעודת זהות של בעל העסק",
    "אישור רואה חשבון / יועץ מס"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      dir="rtl"
    >
      <Card ref={cardRef} className="overflow-hidden border-0 shadow-xl">
        <div className={`px-6 py-5 ${eligible ? "bg-primary" : "bg-destructive"} text-primary-foreground`}>
          <div className="flex items-center justify-between">
            <div>
              {eligible ? (
                <Badge className="bg-secondary text-secondary-foreground text-xs font-bold mb-2">זכאי לפיצוי</Badge>
              ) : (
                <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground text-xs font-bold mb-2">לא זכאי</Badge>
              )}
              <h3 className="text-xl font-bold">
                {eligible ? "נמצאה זכאות לפיצוי" : "לא נמצאה זכאות"}
              </h3>
              <p className="text-sm opacity-80 mt-1">מסלול שאגת הארי — פיצויים עקיפים</p>
            </div>
            {eligible ? (
              <Award className="w-12 h-12 opacity-60" />
            ) : (
              <XCircle className="w-12 h-12 opacity-60" />
            )}
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <ResultRow icon={FileText} label="סוג עסק" value={businessType} />
            <Separator />
            <ResultRow icon={Calculator} label="מחזור שנתי (2025)" value={`${formatCurrency(annualRevenue)} ₪`} />
            <Separator />
            <ResultRow icon={TrendingDown} label="ירידת הכנסות" value={`${declinePercent}%`} />
            <Separator />

            {eligible && (
              <>
                <ResultRow icon={AlertTriangle} label="טווח נזק" value={getDeclineRangeLabel(declinePercent)} />
                <Separator />
                <ResultRow icon={Calculator} label="מקדם הוצאות קבועות" value={`${(coefficient * 100).toFixed(0)}%`} />
                <Separator />
                <ResultRow icon={Calculator} label="רכיב הוצאות קבועות" value={`${formatCurrency(fixedCostsAmount)} ₪`} />
                <Separator />
                <ResultRow icon={DollarSign} label="רכיב שכר" value={`${formatCurrency(salaryAmount)} ₪`} />
                <Separator />
                <ResultRow
                  icon={CheckCircle}
                  label="סך פיצוי חודשי משוער"
                  value={`${formatCurrency(totalAmount)} ₪`}
                  highlight
                />
              </>
            )}

            {!eligible && (
              <div className="bg-destructive/10 rounded-lg p-4 text-sm text-center">
                <p className="font-medium text-destructive">
                  שיעור ירידת ההכנסות ({declinePercent}%) נמוך מ-25% — הסף המינימלי לזכאות.
                </p>
              </div>
            )}
          </div>

          {eligible && (
            <div className="mt-6">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                מסמכים נדרשים להגשת התביעה
              </h4>
              <ul className="space-y-2">
                {requiredDocs.map((doc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleExportPDF}
        disabled={exporting}
        className="w-full mt-3 rounded-xl gap-2 bg-primary hover:bg-primary/90"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        ייצוא דוח PDF
      </Button>
    </motion.div>
  );
}