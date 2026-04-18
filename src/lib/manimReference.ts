/**
 * Manim Community v0.19+ — Few-Shot Examples & Code Validator
 *
 * Strategy: Instead of an abstract API reference (which weak models can't
 * reliably follow), we give concrete working code examples that the model
 * can copy patterns from. This is far more effective for smaller models
 * like Gemini 2.5 Flash.
 */

// ─── FEW-SHOT WORKING EXAMPLES ─────────────────────────────────────────────

export const MANIM_FEW_SHOT_EXAMPLES = `
=== MANIM COMMUNITY v0.19+ — WORKING CODE EXAMPLES ===
COPY these patterns EXACTLY. Do NOT invent constructor arguments.
ALWAYS use keyword arguments (e.g., radius=1) — NEVER positional arguments for geometry/shape classes.

──────────────────────────────────
EXAMPLE 1: Title + explanation text
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        title = Text("Introduction to Calculus", font_size=48)
        title.set_color(BLUE)
        self.play(Write(title))
        self.wait(0.5)

        self.play(title.animate.to_edge(UP))

        explanation = Text(
            "Calculus is the study of change",
            font_size=32
        )
        explanation.next_to(title, DOWN, buff=0.5)
        self.play(FadeIn(explanation))
        self.wait(1)

──────────────────────────────────
EXAMPLE 2: Shapes with colors
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        circle = Circle(radius=1.5)
        circle.set_color(BLUE)
        circle.set_fill(BLUE, opacity=0.3)

        square = Square(side_length=2.0)
        square.set_color(GREEN)

        triangle = Triangle()
        triangle.set_color(YELLOW)

        shapes = VGroup(circle, square, triangle)
        shapes.arrange(RIGHT, buff=1.0)
        self.play(Create(circle), Create(square), Create(triangle))
        self.wait(1)

──────────────────────────────────
EXAMPLE 3: Math equations
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        eq1 = MathTex(r"E = mc^2")
        eq1.set_color(YELLOW)
        eq1.scale(1.5)
        self.play(Write(eq1))
        self.wait(0.5)

        eq2 = MathTex(r"\\int_0^1 x^2 \\, dx = \\frac{1}{3}")
        eq2.next_to(eq1, DOWN, buff=0.5)
        self.play(FadeIn(eq2))
        self.wait(1)

──────────────────────────────────
EXAMPLE 4: Function graph
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[-1, 9, 1],
            x_length=6,
            y_length=5,
        )
        axes_labels = axes.get_axis_labels(x_label="x", y_label="y")

        graph = axes.plot(lambda x: x**2, color=BLUE)
        graph_label = axes.get_graph_label(graph, label="x^2")

        self.play(Create(axes), Write(axes_labels))
        self.play(Create(graph), Write(graph_label))
        self.wait(1)

──────────────────────────────────
EXAMPLE 5: Arrows, lines, vectors
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        arrow = Arrow(start=LEFT * 3, end=RIGHT * 3)
        arrow.set_color(RED)
        self.play(GrowArrow(arrow))

        line = Line(start=UP * 2, end=DOWN * 2)
        line.set_color(WHITE)

        dashed = DashedLine(start=LEFT * 2, end=RIGHT * 2)
        dashed.set_color(GREY)
        dashed.shift(DOWN * 1.5)

        self.play(Create(line), Create(dashed))
        self.wait(1)

──────────────────────────────────
EXAMPLE 6: Code display
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        code_display = Code(
            code_string=\"\"\"def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)\"\"\",
            language="python",
        )
        code_display.scale(0.75)
        self.play(Create(code_display))
        self.wait(1)

──────────────────────────────────
EXAMPLE 7: Tables
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        table = Table(
            [["1", "2", "3"],
             ["4", "5", "6"]],
            row_labels=[Text("Row 1"), Text("Row 2")],
            col_labels=[Text("A"), Text("B"), Text("C")],
        )
        table.scale(0.7)
        self.play(Create(table))
        self.wait(1)

──────────────────────────────────
EXAMPLE 8: Transforms and movement
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        circle = Circle(radius=1.0)
        circle.set_color(BLUE)
        self.play(Create(circle))

        square = Square(side_length=2.0)
        square.set_color(RED)
        self.play(Transform(circle, square))
        self.wait(0.5)

        self.play(circle.animate.shift(RIGHT * 2))
        self.play(circle.animate.scale(0.5))
        self.wait(1)

──────────────────────────────────
EXAMPLE 9: Braces and labels
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        rect = Rectangle(width=4.0, height=2.0)
        rect.set_color(BLUE)

        brace_bottom = Brace(rect, direction=DOWN)
        label_bottom = brace_bottom.get_text("width = 4")

        brace_right = Brace(rect, direction=RIGHT)
        label_right = brace_right.get_text("height = 2")

        self.play(Create(rect))
        self.play(Create(brace_bottom), Write(label_bottom))
        self.play(Create(brace_right), Write(label_right))
        self.wait(1)

──────────────────────────────────
EXAMPLE 10: Bullet lists
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        title = Text("Key Concepts", font_size=40)
        title.set_color(YELLOW)
        title.to_edge(UP)
        self.play(Write(title))

        bullets = BulletedList(
            "Variables store data",
            "Functions perform actions",
            "Loops repeat code",
            font_size=30,
        )
        bullets.next_to(title, DOWN, buff=0.5)
        self.play(FadeIn(bullets))
        self.wait(1)

──────────────────────────────────
EXAMPLE 11: NumberPlane with plot
──────────────────────────────────
from manim import *
import numpy as np

class GeneratedScene(Scene):
    def construct(self):
        plane = NumberPlane(
            x_range=[-4, 4, 1],
            y_range=[-4, 4, 1],
        )
        self.play(Create(plane))

        func = plane.plot(lambda x: np.sin(x), color=YELLOW)
        self.play(Create(func))
        self.wait(1)

──────────────────────────────────
EXAMPLE 12: ValueTracker animation
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        tracker = ValueTracker(0)

        number = DecimalNumber(num_decimal_places=2)
        number.set_color(WHITE)
        number.scale(1.5)
        number.add_updater(lambda m: m.set_value(tracker.get_value()))

        self.add(number)
        self.play(tracker.animate.set_value(10), run_time=3)
        self.wait(1)

──────────────────────────────────
EXAMPLE 13: SurroundingRectangle highlight
──────────────────────────────────
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        text = Text("Important!", font_size=40)
        box = SurroundingRectangle(text, color=YELLOW, buff=0.3)
        self.play(Write(text))
        self.play(Create(box))
        self.play(Indicate(text))
        self.wait(1)

=== STRICT RULES ===
1. ALWAYS use keyword arguments for ALL constructor parameters (except the first text/string argument for Text/MathTex/Tex).
   ✅ Circle(radius=1.5)
   ✅ Rectangle(width=4, height=2)
   ✅ Arrow(start=LEFT, end=RIGHT)
   ✅ Arc(radius=1, start_angle=0, angle=PI/2)
   ✅ Annulus(inner_radius=0.5, outer_radius=1.5)
   ✅ AnnularSector(inner_radius=0.5, outer_radius=1.5, angle=PI/3)
   ✅ Sector(outer_radius=2, angle=PI/3)
   ❌ Circle(1.5)  — NO positional args for shapes!
   ❌ AnnularSector(0.5, 1.5, PI/3)  — will cause "multiple values" error!

2. NEVER pass font_size=, color=, font=, or code= to Code(). Only use code_string= and language=. Use .scale() for sizing.

3. NEVER use deprecated classes: ShowCreation, TextMobject, TexMobject, FadeInFrom, FadeOutAndShift.
   Use Create(), Text(), Tex(), FadeIn(shift=), FadeOut(shift=) instead.

4. ALWAYS use 'from manim import *'.

5. ALWAYS name the scene class 'GeneratedScene'.

6. Use .set_color(COLOR) after creation if a constructor doesn't accept color.

7. Use axes.plot() not axes.get_graph().

8. Available colors: RED, BLUE, GREEN, YELLOW, WHITE, BLACK, GREY, GRAY, PURPLE, ORANGE, PINK, TEAL, GOLD, MAROON.

9. Available directions: UP, DOWN, LEFT, RIGHT, ORIGIN, UL, UR, DL, DR.

10. Available animations: Create, Write, FadeIn, FadeOut, Transform, ReplacementTransform, GrowArrow, DrawBorderThenFill, Indicate, Circumscribe, Flash, Rotate, MoveAlongPath, AnimationGroup, LaggedStart, Succession.

=== END ===
`;

// ─── CODE VALIDATOR ─────────────────────────────────────────────────────────

interface ValidationError {
  line: number;
  pattern: string;
  message: string;
  fix: string;
}

/**
 * Known anti-patterns that will crash Manim's renderer.
 * Each entry has a regex to detect the pattern, a human-readable message,
 * and a suggested fix.
 */
const ANTI_PATTERNS: Array<{
  regex: RegExp;
  message: string;
  fix: string;
}> = [
  // ── Code class misuse ──
  {
    regex: /Code\s*\([^)]*\bcode\s*=/,
    message: "Code() does not accept 'code=' argument",
    fix: "Use 'code_string=' instead: Code(code_string=\"...\", language=\"python\")",
  },
  {
    regex: /Code\s*\([^)]*\bfont_size\s*=/,
    message: "Code() does not accept 'font_size=' argument",
    fix: "Remove font_size and use .scale() instead: code_obj.scale(0.7)",
  },
  {
    regex: /Code\s*\([^)]*\bcolor\s*=/,
    message: "Code() does not accept 'color=' argument",
    fix: "Remove color from Code() constructor. Use .set_color() after creation if needed",
  },
  {
    regex: /Code\s*\([^)]*\bfont\s*=/,
    message: "Code() does not accept 'font=' argument",
    fix: "Remove font from Code() constructor",
  },
  // ── Deprecated/removed classes ──
  {
    regex: /ShowCreation\s*\(/,
    message: "ShowCreation is deprecated/removed",
    fix: "Use Create() instead of ShowCreation()",
  },
  {
    regex: /FadeInFrom\s*\(/,
    message: "FadeInFrom is deprecated/removed",
    fix: "Use FadeIn(mobject, shift=direction) instead",
  },
  {
    regex: /FadeOutAndShift\s*\(/,
    message: "FadeOutAndShift is deprecated/removed",
    fix: "Use FadeOut(mobject, shift=direction) instead",
  },
  {
    regex: /TextMobject\s*\(/,
    message: "TextMobject is removed — it was from ManimGL/old Manim",
    fix: "Use Text() or Tex() instead",
  },
  {
    regex: /TexMobject\s*\(/,
    message: "TexMobject is removed — it was from ManimGL/old Manim",
    fix: "Use Tex() or MathTex() instead",
  },
  // ── Deprecated methods ──
  {
    regex: /\.get_graph\s*\(/,
    message: ".get_graph() is deprecated on Axes",
    fix: "Use axes.plot(func) instead of axes.get_graph(func)",
  },
  // ── Wrong library ──
  {
    regex: /from\s+manimlib/,
    message: "Importing from manimlib (ManimGL) — wrong library",
    fix: "Use 'from manim import *' for Manim Community",
  },
  // ── Positional argument traps for geometry classes ──
  // These detect common geometry constructors called with positional args
  {
    regex: /AnnularSector\s*\(\s*\d/,
    message: "AnnularSector() called with positional args — use keyword args only",
    fix: "Use AnnularSector(inner_radius=..., outer_radius=..., angle=..., start_angle=...)",
  },
  {
    regex: /Annulus\s*\(\s*\d/,
    message: "Annulus() called with positional args — use keyword args only",
    fix: "Use Annulus(inner_radius=..., outer_radius=...)",
  },
  {
    regex: /Sector\s*\(\s*\d/,
    message: "Sector() called with positional args — use keyword args only",
    fix: "Use Sector(outer_radius=..., inner_radius=..., angle=..., start_angle=...)",
  },
  {
    regex: /Arc\s*\(\s*\d/,
    message: "Arc() called with positional args — use keyword args only",
    fix: "Use Arc(radius=..., start_angle=..., angle=...)",
  },
  {
    regex: /Circle\s*\(\s*\d/,
    message: "Circle() called with positional args — use keyword args only",
    fix: "Use Circle(radius=...)",
  },
  {
    regex: /Dot\s*\(\s*\d/,
    message: "Dot() called with a number as positional arg — use keyword args",
    fix: "Use Dot(point=..., radius=...) or Dot(color=...)",
  },
  {
    regex: /Square\s*\(\s*\d/,
    message: "Square() called with positional args — use keyword args only",
    fix: "Use Square(side_length=...)",
  },
  {
    regex: /Ellipse\s*\(\s*\d/,
    message: "Ellipse() called with positional args — use keyword args only",
    fix: "Use Ellipse(width=..., height=...)",
  },
  {
    regex: /Sphere\s*\(\s*\d/,
    message: "Sphere() called with positional args — use keyword args only",
    fix: "Use Sphere(radius=...)",
  },
  {
    regex: /Cube\s*\(\s*\d/,
    message: "Cube() called with positional args — use keyword args only",
    fix: "Use Cube(side_length=...)",
  },
  {
    regex: /Cylinder\s*\(\s*\d/,
    message: "Cylinder() called with positional args — use keyword args only",
    fix: "Use Cylinder(radius=..., height=...)",
  },
  {
    regex: /Cone\s*\(\s*\d/,
    message: "Cone() called with positional args — use keyword args only",
    fix: "Use Cone(base_radius=..., height=...)",
  },
  {
    regex: /RegularPolygon\s*\(\s*\d/,
    message: "RegularPolygon() called with positional args — use keyword args only",
    fix: "Use RegularPolygon(n=...)",
  },
  {
    regex: /Rectangle\s*\(\s*\d/,
    message: "Rectangle() called with positional args — use keyword args only",
    fix: "Use Rectangle(width=..., height=...)",
  },
  {
    regex: /RoundedRectangle\s*\(\s*\d/,
    message: "RoundedRectangle() called with positional args — use keyword args only",
    fix: "Use RoundedRectangle(corner_radius=..., width=..., height=...)",
  },
];

/**
 * Validates generated Manim code against known anti-patterns.
 * Returns an array of detected issues with line numbers and fixes.
 */
export function validateManimCode(code: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip comments and empty lines
    if (line.startsWith('#') || line === '') continue;

    for (const pattern of ANTI_PATTERNS) {
      if (pattern.regex.test(line)) {
        errors.push({
          line: i + 1,
          pattern: pattern.regex.source,
          message: pattern.message,
          fix: pattern.fix,
        });
      }
    }
  }

  return errors;
}

/**
 * Formats validation errors into a prompt string that can be sent back
 * to the LLM for self-correction.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  let result = `\n⚠️ CODE VALIDATION FOUND ${errors.length} ISSUE(S) THAT WILL CRASH THE RENDERER:\n`;
  for (const err of errors) {
    result += `  Line ${err.line}: ${err.message}\n`;
    result += `    Fix: ${err.fix}\n`;
  }
  result += `\nYou MUST fix ALL the above issues. Return ONLY the complete, corrected Python code.\n`;
  return result;
}
