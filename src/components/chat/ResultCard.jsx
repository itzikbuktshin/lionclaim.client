import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle, XCircle, TrendingDown, Calculator, 
  FileText, AlertTriangle, Award, Download, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatCurrency, getDamageCoefficientLabel } from "@/lib/compensationCalc";
import jsPDF from "jspdf";

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
  const { eligible, declinePercent, coefficient, amount, tier, annualRevenue, businessType } = result;
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = () => {
    setExporting(true);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // RTL support via mirroring layout manually
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 20;

    const rtlText = (text, x, yPos, opts = {}) => {
      doc.text(text, x, yPos, { align: "right", ...opts });
    };

    // Header background
    doc.setFillColor(eligible ? 28 : 220, eligible ? 56 : 38, eligible ? 100 : 38);
    doc.roundedRect(margin, y, contentW, 28, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    rtlText(eligible ? "נמצאה זכאות לפיצוי" : "לא נמצאה זכאות", margin + contentW, y + 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    rtlText("מסלול שאגת הארי — פיצויים עקיפים לעסקים", margin + contentW, y + 18);
    rtlText(`תאריך הפקה: ${new Date().toLocaleDateString("he-IL")}`, margin + contentW, y + 24);

    y += 36;
    doc.setTextColor(30, 30, 30);

    const drawRow = (label, value, highlight = false) => {
      doc.setFillColor(highlight ? 250 : 248, highlight ? 245 : 248, highlight ? 230 : 250);
      doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", highlight ? "bold" : "normal");
      doc.setTextColor(highlight ? 180 : 80, highlight ? 120 : 80, highlight ? 0 : 80);
      rtlText(label, margin + contentW - 3, y + 6.5);
      doc.setTextColor(highlight ? 20 : 30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(value, margin + 3, y + 6.5);
      y += 13;
    };

    drawRow("סוג עסק", businessType);
    drawRow("הכנסות שנתיות (2025)", `${formatCurrency(annualRevenue)} ILS`);
    drawRow("שיעור ירידת הכנסות", `${declinePercent}%`);

    if (eligible) {
      drawRow("טווח נזק", getDamageCoefficientLabel(declinePercent));
      drawRow("מקדם נזק", `x${coefficient}`);
      drawRow("מדרגת פיצוי", tier);
      drawRow("סכום פיצוי משוער", `${formatCurrency(amount)} ILS`, true);
    } else {
      y += 4;
      doc.setFillColor(255, 230, 230);
      doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
      doc.setTextColor(180, 30, 30);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      rtlText(`שיעור ירידת ההכנסות (${declinePercent}%) נמוך מ-25% — הסף המינימלי לזכאות.`, margin + contentW - 3, y + 9);
      y += 18;
    }

    if (eligible) {
      y += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      rtlText("מסמכים נדרשים להגשת התביעה", margin + contentW, y);
      y += 8;

      const docs = [
        "דוחות כספיים / רווח והפסד לשנת 2025",
        'דוחות מע"מ לתקופת הבסיס (מרץ-אפריל 2025)',
        "דוחות מע\"מ לתקופת הפיצוי",
        "אישור ניהול חשבון בנק",
        "צילום תעודת זהות של בעל העסק",
        "אישור רואה חשבון / יועץ מס"
      ];

      docs.forEach((d, i) => {
        doc.setFillColor(245, 247, 252);
        doc.roundedRect(margin, y, contentW, 9, 2, 2, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        rtlText(d, margin + contentW - 3, y + 6);
        doc.setTextColor(28, 56, 100);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}.`, margin + 6, y + 6);
        y += 12;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    rtlText("* דוח זה הינו אינדיקציה בלבד ואינו מהווה אישור רשמי לזכאות", pageW - margin, 285);

    doc.save(`שאגת-הארי-בדיקת-זכאות-${new Date().toLocaleDateString("he-IL").replace(/\//g, "-")}.pdf`);
    setExporting(false);
  };

  const requiredDocs = [
    "דוחות כספיים / רווח והפסד לשנת 2025",
    "דוחות מע\"מ לתקופת הבסיס (מרץ-אפריל 2025)",
    "דוחות מע\"מ לתקופת הפיצוי",
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
      <Card className="overflow-hidden border-0 shadow-xl">
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
            <ResultRow icon={Calculator} label="הכנסות שנתיות (2025)" value={`${formatCurrency(annualRevenue)} ₪`} />
            <Separator />
            <ResultRow icon={TrendingDown} label="שיעור ירידת הכנסות" value={`${declinePercent}%`} />
            <Separator />

            {eligible && (
              <>
                <ResultRow icon={AlertTriangle} label="טווח נזק" value={getDamageCoefficientLabel(declinePercent)} />
                <Separator />
                <ResultRow icon={Calculator} label="מקדם נזק" value={`×${coefficient}`} />
                <Separator />
                <ResultRow icon={Calculator} label="מדרגת פיצוי" value={tier} />
                <Separator />
                <ResultRow 
                  icon={CheckCircle} 
                  label="סכום פיצוי משוער" 
                  value={`${formatCurrency(amount)} ₪`} 
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
          <div className="mt-6 pt-4 border-t border-border">
            <Button
              onClick={handleExportPDF}
              disabled={exporting}
              className="w-full rounded-xl gap-2 bg-primary hover:bg-primary/90"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              ייצוא דוח PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}