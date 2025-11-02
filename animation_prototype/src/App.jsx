import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState } from 'react';
import { OrbitControls, useGLTF } from '@react-three/drei';

function RotatingModel({ buffer }) {
  const { scene } = useGLTF('/eye_model.glb');
  const ref = useRef();

  useFrame(() => {
    if (buffer.length > 0) {
      const [flag, x, y, z] = buffer.shift();
      // Only apply rotation if flag is 1 (valid)
      if (flag === 1) {
        ref.current.rotation.set(x, y, z);
      }
    }
  });

  return <primitive ref={ref} object={scene} scale={1} />;
}

export default function App() {
  const [rotationBuffer, setRotationBuffer] = useState([]);

  useEffect(() => {
    fetch('/leye_file.txt')
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n').filter(Boolean);
        const parsed = lines
          .map(line => {
            // Expected format: 1, (0, 0, 0)
            const [flagPart, rotationPart] = line.split(',');
            const flag = parseInt(flagPart.trim(), 10);
            const match = line.match(/\(([^)]+)\)/);
            if (!match) return null;
            const [x, y, z] = match[1]
              .split(',')
              .map(v => parseFloat(v.trim()));
            return [flag, x, y, z];
          })
          .filter(Boolean);

        setRotationBuffer(parsed);
      });
  }, []);

  return (
    <Canvas style={{ width: '100vw', height: '100vh' }} camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 5, 5]} />
      <Suspense fallback={null}>
        <RotatingModel buffer={rotationBuffer} />
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}
