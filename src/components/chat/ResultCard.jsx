import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, TrendingDown, Calculator,
  FileText, AlertTriangle, Award, Download, Loader2, DollarSign, Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatCurrency, getDeclineRangeLabel } from "@/lib/compensationCalc";
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

const requiredDocs = [
  "דוחות מע\"מ לתקופת הבסיס (מרץ-אפריל 2025)",
  "דוחות מע\"מ לתקופת הפיצוי (מרץ-אפריל 2026)",
  "דוחות שכר לשנת 2025",
  "אישור ניהול חשבון בנק",
  "צילום תעודת זהות של בעל העסק",
  "אישור רואה חשבון / יועץ מס",
];

export default function ResultCard({ result }) {
  const {
    eligible, declinePercent, businessCategory,
    expenseComponent, expenseCoefficient, salaryComponent,
    subtotalBeforeCap, monthlyCapApplied, compensationAmount,
    additionalDirectDamage, finalCompensation,
    baseAmount, damageCoefficient,
    notes = [],
  } = result;

  const [exporting, setExporting] = useState(false);
  const cardRef = useRef(null);

  const handleExportPDF = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const el = cardRef.current;
      const fullH = el.scrollHeight;
      const fullW = el.scrollWidth;
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
        scrollX: 0, scrollY: 0,
        width: fullW, height: fullH,
        windowWidth: fullW, windowHeight: fullH,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210, pageH = 297, margin = 10, maxW = pageW - margin * 2;
      const imgH = (canvas.height * maxW) / canvas.width;
      // split across pages if content is taller than one page
      const usableH = pageH - margin * 2;
      if (imgH <= usableH) {
        pdf.addImage(imgData, "PNG", margin, (pageH - imgH) / 2, maxW, imgH);
      } else {
        const pageImgH = (usableH * canvas.width) / maxW;
        let srcY = 0;
        while (srcY < canvas.height) {
          const sliceH = Math.min(pageImgH, canvas.height - srcY);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          sliceCanvas.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, maxW, (sliceH * maxW) / canvas.width);
          srcY += sliceH;
          if (srcY < canvas.height) pdf.addPage();
        }
      }
      pdf.save(`שאגת-הארי-${new Date().toLocaleDateString("he-IL").replace(/\//g, "-")}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      dir="rtl"
    >
      <Card ref={cardRef} className="overflow-hidden border-0 shadow-xl">
        {/* Header */}
        <div className={`px-6 py-5 ${eligible ? "bg-primary" : "bg-destructive"} text-primary-foreground`}>
          <div className="flex items-center justify-between">
            <div>
              <Badge className={eligible ? "bg-secondary text-secondary-foreground text-xs font-bold mb-2" : "border border-primary-foreground/30 text-primary-foreground text-xs font-bold mb-2"}>
                {eligible ? "זכאי לפיצוי" : "לא זכאי"}
              </Badge>
              <h3 className="text-xl font-bold">{eligible ? "נמצאה זכאות לפיצוי" : "לא נמצאה זכאות"}</h3>
              <p className="text-sm opacity-80 mt-1">מסלול שאגת הארי — פיצויים עקיפים</p>
            </div>
            {eligible ? <Award className="w-12 h-12 opacity-60" /> : <XCircle className="w-12 h-12 opacity-60" />}
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Common rows */}
          <div className="space-y-1">
            <ResultRow icon={TrendingDown} label="ירידת הכנסות" value={`${declinePercent}%`} />
            <Separator />
            <ResultRow icon={AlertTriangle} label="טווח נזק" value={getDeclineRangeLabel(declinePercent)} />
            <Separator />

            {/* Not eligible */}
            {!eligible && (
              <div className="bg-destructive/10 rounded-lg p-4 text-sm text-center mt-2">
                <p className="font-medium text-destructive">
                  {notes[0] || `שיעור ירידת ההכנסות (${declinePercent}%) נמוך מ-25% — הסף המינימלי לזכאות.`}
                </p>
              </div>
            )}

            {/* Small business */}
            {eligible && businessCategory === "small" && (
              <>
                <ResultRow icon={Calculator} label="פיצוי בסיס (לפי מחזור)" value={`${formatCurrency(baseAmount)} ₪`} />
                <Separator />
                <ResultRow icon={Calculator} label="מקדם נזק" value={`×${damageCoefficient}`} />
                <Separator />
                <ResultRow icon={CheckCircle} label="סך פיצוי חודשי משוער" value={`${formatCurrency(finalCompensation)} ₪`} highlight />
              </>
            )}

            {/* Large business */}
            {eligible && businessCategory === "large" && (
              <>
                <ResultRow icon={Calculator} label="מקדם הוצאות קבועות" value={`${((expenseCoefficient || 0) * 100).toFixed(0)}%`} />
                <Separator />
                <ResultRow icon={Calculator} label="רכיב תשומות" value={`${formatCurrency(expenseComponent)} ₪`} />
                <Separator />
                <ResultRow icon={DollarSign} label="רכיב שכר" value={`${formatCurrency(salaryComponent)} ₪`} />
                <Separator />
                <ResultRow icon={Calculator} label="סכום לפני תקרה" value={`${formatCurrency(subtotalBeforeCap)} ₪`} />
                <Separator />
                {subtotalBeforeCap > monthlyCapApplied && (
                  <>
                    <ResultRow icon={AlertTriangle} label="תקרה חודשית" value={`${formatCurrency(monthlyCapApplied)} ₪`} />
                    <Separator />
                  </>
                )}
                <Separator />
                <ResultRow icon={CheckCircle} label="סך פיצוי חודשי משוער" value={`${formatCurrency(finalCompensation)} ₪`} highlight />
              </>
            )}
          </div>

          {/* Notes */}
          {notes.length > 0 && (
            <div className="bg-accent rounded-lg p-3 space-y-1">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary/60" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}

          {/* Required docs */}
          {eligible && (
            <div className="mt-4">
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
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        ייצוא דוח PDF
      </Button>
    </motion.div>
  );
}