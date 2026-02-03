'use client';

import { useEffect, useRef, useState } from 'react';

export function DotScreenShader() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Mouse tracking
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({
                x: e.clientX / window.innerWidth,
                y: 1.0 - e.clientY / window.innerHeight,
            });
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Vertex shader
        const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

        // Fragment shader with smaller dots and mouse interaction
        const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;
      uniform vec2 mouse;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        
        // Create finer grid for smaller dots
        vec2 grid = fract(uv * 120.0); // Increased from 40.0 to 120.0 for smaller dots
        
        // Create circular dots
        float dist = length(grid - 0.5);
        float radius = 0.15; // Smaller radius for smaller dots
        float dot = smoothstep(radius, radius - 0.05, dist);
        
        // Mouse interaction - create ripple effect
        float mouseDist = length(uv - mouse);
        float mouseEffect = exp(-mouseDist * 3.0) * 0.3;
        
        // Animate with time and mouse
        float wave = sin(uv.x * 15.0 + time + mouseEffect * 10.0) * 
                     cos(uv.y * 15.0 + time + mouseEffect * 10.0) * 0.3 + 0.7;
        
        // Color gradient - darker purple to blue
        vec3 color1 = vec3(0.05, 0.0, 0.15); // Very dark purple
        vec3 color2 = vec3(0.0, 0.1, 0.25); // Dark blue
        vec3 color3 = vec3(0.1, 0.15, 0.4); // Lighter blue for mouse effect
        
        vec3 color = mix(color1, color2, uv.y);
        color = mix(color, color3, mouseEffect);
        
        // Apply dot pattern
        color *= dot * 0.7 + 0.3;
        color *= wave;
        
        // Add subtle glow near mouse
        color += mouseEffect * vec3(0.1, 0.2, 0.4);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

        // Compile shader
        const compileShader = (source: string, type: number) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) return;

        // Create program
        const program = gl.createProgram();
        if (!program) return;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return;
        }

        gl.useProgram(program);

        // Set up geometry (full screen quad)
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        );

        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Get uniform locations
        const resolutionLocation = gl.getUniformLocation(program, 'resolution');
        const timeLocation = gl.getUniformLocation(program, 'time');
        const mouseLocation = gl.getUniformLocation(program, 'mouse');

        // Animation loop
        let startTime = Date.now();
        let animationId: number;

        const render = () => {
            const currentTime = (Date.now() - startTime) * 0.001; // Convert to seconds

            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            gl.uniform1f(timeLocation, currentTime);
            gl.uniform2f(mouseLocation, mousePos.x, mousePos.y);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            animationId = requestAnimationFrame(render);
        };

        render();

        // Cleanup
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
        };
    }, [mousePos]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: 'block' }}
        />
    );
}
