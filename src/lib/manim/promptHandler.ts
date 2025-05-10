/**
 * Prompt Handler Utility
 * 
 * This module provides functions for processing natural language prompts
 * and converting them to Manim code using AI.
 */

interface PromptResponse {
  manimCode: string;
}

/**
 * Process a natural language prompt and convert it to Manim code
 */
export async function processPrompt(prompt: string): Promise<string> {
  try {
    // In a real implementation, this would call an AI API
    // For now, we'll simulate the response with template code
    
    // Example prompt for generating Manim code
    const systemPrompt = `
      You are an expert in Manim Community Edition and mathematics visualization.
      Convert the user's prompt into valid Manim Python code that creates a 3Blue1Brown-style animation.
      Only return the Python code without any explanations or markdown formatting.
      The code should be a complete, runnable Manim scene that demonstrates the concept requested.
    `;
    
    // In a real app, this would call an AI API like:
    // const response = await callAIService(systemPrompt, prompt);
    
    // For now, we'll return template code based on the prompt
    const manimCode = getTemplateCode(prompt);
    
    // Basic validation - ensure it contains Scene class
    if (!manimCode.includes("class") || !manimCode.includes("Scene")) {
      throw new Error("Generated code does not contain a valid Manim scene");
    }
    
    return manimCode;
  } catch (error) {
    console.error(`Error processing prompt: ${error}`);
    throw error;
  }
}

/**
 * Get predefined template code for common animations
 */
function getTemplateCode(prompt: string): string {
  // Simple keyword matching to select a template
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes("function") || promptLower.includes("graph")) {
    return getFunctionGraphTemplate();
  } else if (promptLower.includes("vector") || promptLower.includes("field")) {
    return getVectorFieldTemplate();
  } else if (promptLower.includes("pythagorean") || promptLower.includes("theorem")) {
    return getPythagoreanTheoremTemplate();
  } else {
    return getDefaultTemplate();
  }
}

/**
 * Template for function graphs
 */
function getFunctionGraphTemplate(): string {
  return `
from manim import *

class FunctionGraph(Scene):
    def construct(self):
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[-5, 5, 1],
            axis_config={"color": BLUE},
        )
        
        # Add labels
        x_label = axes.get_x_axis_label("x")
        y_label = axes.get_y_axis_label("y")
        
        # Create graph
        graph = axes.plot(lambda x: x**2, color=YELLOW)
        graph_label = MathTex("f(x) = x^2").next_to(graph, UP)
        
        # Animation sequence
        self.play(Create(axes), Write(x_label), Write(y_label))
        self.wait()
        self.play(Create(graph), Write(graph_label))
        self.wait(2)
  `;
}

/**
 * Template for vector fields
 */
function getVectorFieldTemplate(): string {
  return `
from manim import *

class VectorField(Scene):
    def construct(self):
        # Create a vector field
        vector_field = VectorField(
            lambda x, y: np.array([y, -x, 0]),
            x_range=[-5, 5, 1],
            y_range=[-5, 5, 1],
            color=BLUE
        )
        
        # Create a stream line
        stream_lines = StreamLines(
            lambda x, y: np.array([y, -x, 0]),
            x_range=[-5, 5, 1],
            y_range=[-5, 5, 1],
            stroke_width=2,
            color=YELLOW
        )
        
        # Animation sequence
        self.play(Create(vector_field))
        self.wait()
        self.play(Create(stream_lines))
        self.wait(2)
  `;
}

/**
 * Template for Pythagorean theorem
 */
function getPythagoreanTheoremTemplate(): string {
  return `
from manim import *

class PythagoreanTheorem(Scene):
    def construct(self):
        # Create a right triangle
        triangle = Polygon(
            ORIGIN, RIGHT * 3, UP * 4,
            color=WHITE
        )
        
        # Add labels for sides
        a_label = MathTex("a = 3").next_to(triangle, DOWN)
        b_label = MathTex("b = 4").next_to(triangle, RIGHT)
        c_label = MathTex("c = 5").next_to(triangle, UP + LEFT)
        
        # Create squares on each side
        square_a = Square(side_length=3).shift(RIGHT * 1.5 + DOWN * 1.5)
        square_b = Square(side_length=4).shift(RIGHT * 3 + UP * 2)
        square_c = Square(side_length=5).shift(LEFT * 2.5 + UP * 2)
        
        # Color the squares
        square_a.set_fill(BLUE, opacity=0.5)
        square_b.set_fill(RED, opacity=0.5)
        square_c.set_fill(GREEN, opacity=0.5)
        
        # Add area labels
        area_a = MathTex("a^2 = 9").next_to(square_a, DOWN)
        area_b = MathTex("b^2 = 16").next_to(square_b, RIGHT)
        area_c = MathTex("c^2 = 25").next_to(square_c, LEFT)
        
        # Pythagorean equation
        equation = MathTex("a^2 + b^2 = c^2").to_edge(DOWN)
        
        # Animation sequence
        self.play(Create(triangle))
        self.play(Write(a_label), Write(b_label), Write(c_label))
        self.wait()
        
        self.play(Create(square_a), Create(square_b), Create(square_c))
        self.play(
            square_a.animate.set_fill(BLUE, opacity=0.5),
            square_b.animate.set_fill(RED, opacity=0.5),
            square_c.animate.set_fill(GREEN, opacity=0.5)
        )
        
        self.play(Write(area_a), Write(area_b), Write(area_c))
        self.wait()
        
        self.play(Write(equation))
        self.wait(2)
  `;
}

/**
 * Default template for when no specific keywords are matched
 */
function getDefaultTemplate(): string {
  return `
from manim import *

class MathAnimation(Scene):
    def construct(self):
        # Title
        title = Text("3Blue1Brown Style Animation", font_size=40)
        self.play(Write(title))
        self.wait()
        self.play(title.animate.to_edge(UP))
        
        # Create a circle
        circle = Circle(radius=2, color=BLUE)
        self.play(Create(circle))
        
        # Add a dot at the center
        dot = Dot(ORIGIN, color=YELLOW)
        self.play(FadeIn(dot))
        
        # Create a moving dot on the circle
        theta = ValueTracker(0)
        dot2 = Dot(color=RED)
        dot2.add_updater(lambda d: d.move_to(
            circle.point_at_angle(theta.get_value())
        ))
        
        self.add(dot2)
        self.play(theta.animate.set_value(TAU), run_time=3)
        
        # Add a mathematical equation
        equation = MathTex("e^{i\\pi} + 1 = 0")
        self.play(Write(equation))
        
        # Final arrangement
        self.play(
            equation.animate.next_to(circle, DOWN, buff=1),
            run_time=2
        )
        self.wait(2)
  `;
}

/**
 * Call an AI service to generate Manim code
 * This is a placeholder for the actual implementation
 */
async function callAIService(systemPrompt: string, userPrompt: string): Promise<string> {
  console.log("AI Service would be called with:", { systemPrompt, userPrompt });
  return getDefaultTemplate();
}
