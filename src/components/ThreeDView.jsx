import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import useHouseStore from '../store/houseStore.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const SCALE = 0.3048      // 1 ft → metres
const WALL_H = 9 * SCALE  // 9 ft ceiling in metres (~2.74m)
const WALL_T = 0.15       // wall thickness (m)
const EYE_H  = 1.65       // eye height (m)

function ft(v) { return v * SCALE }

// ── Shared materials (created once) ──────────────────────────────────────────
const M = {
  brickWall:   new THREE.MeshStandardMaterial({ color: '#8B3A3A', roughness: 0.85 }),
  plasterWall: new THREE.MeshStandardMaterial({ color: '#f0ebe0', roughness: 0.70 }),
  woodTrim:    new THREE.MeshStandardMaterial({ color: '#3B1F0A', roughness: 0.60, metalness: 0.05 }),
  winFrame:    new THREE.MeshStandardMaterial({ color: '#f5f0e8', roughness: 0.50 }),
  glass:       new THREE.MeshStandardMaterial({ color: '#a8d4f5', transparent: true, opacity: 0.32, roughness: 0 }),
  ceiling:     new THREE.MeshStandardMaterial({ color: '#faf8f4', roughness: 0.90 }),
  roofTile:    new THREE.MeshStandardMaterial({ color: '#4a3728', roughness: 0.90, side: THREE.DoubleSide }),
  chimney:     new THREE.MeshStandardMaterial({ color: '#7a3a2a', roughness: 0.90 }),
  ground:      new THREE.MeshStandardMaterial({ color: '#3a5a2a', roughness: 0.95 }),
  poolWater:   new THREE.MeshStandardMaterial({ color: '#1a7fbf', transparent: true, opacity: 0.85, roughness: 0.10 }),
  poolDeck:    new THREE.MeshStandardMaterial({ color: '#f0ece5', roughness: 0.20, metalness: 0.10 }),
  // Floors
  floorLiving:   new THREE.MeshStandardMaterial({ color: '#5C3A1E', roughness: 0.55, metalness: 0.02 }),
  floorKitchen:  new THREE.MeshStandardMaterial({ color: '#C8B89A', roughness: 0.30 }),
  floorBath:     new THREE.MeshStandardMaterial({ color: '#D4CBC0', roughness: 0.25, metalness: 0.05 }),
  floorBedroom:  new THREE.MeshStandardMaterial({ color: '#8B6914', roughness: 0.50 }),
  floorHallway:  new THREE.MeshStandardMaterial({ color: '#2C1810', roughness: 0.45, metalness: 0.03 }),
  floorDefault:  new THREE.MeshStandardMaterial({ color: '#c8bfb0', roughness: 0.60 }),
  // Furniture
  chesterfield: new THREE.MeshStandardMaterial({ color: '#6B2020', roughness: 0.70, metalness: 0.05 }),
  darkWood:     new THREE.MeshStandardMaterial({ color: '#2C1200', roughness: 0.60, metalness: 0.05 }),
  medWood:      new THREE.MeshStandardMaterial({ color: '#6B3F1A', roughness: 0.55, metalness: 0.02 }),
  lightWood:    new THREE.MeshStandardMaterial({ color: '#C8A87A', roughness: 0.50 }),
  marble:       new THREE.MeshStandardMaterial({ color: '#f0ece5', roughness: 0.20, metalness: 0.10 }),
  brass:        new THREE.MeshStandardMaterial({ color: '#B8860B', roughness: 0.30, metalness: 0.80 }),
  porcelain:    new THREE.MeshStandardMaterial({ color: '#FFFFF0', roughness: 0.15, metalness: 0.05 }),
  fabric:       new THREE.MeshStandardMaterial({ color: '#4A3728', roughness: 0.90 }),
  bedLinens:    new THREE.MeshStandardMaterial({ color: '#EDE0C4', roughness: 0.80 }),
  fireBrick:    new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.85 }),
  fireOpen:     new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.90 }),
  counterTop:   new THREE.MeshStandardMaterial({ color: '#E8DDD0', roughness: 0.30, metalness: 0.15 }),
  rug:          new THREE.MeshStandardMaterial({ color: '#6B3A2A', roughness: 0.90 }),
}

function floorMat(type) {
  switch (type) {
    case 'living': case 'dining': return M.floorLiving
    case 'kitchen':  return M.floorKitchen
    case 'bathroom': return M.floorBath
    case 'bedroom':  return M.floorBedroom
    case 'hallway':  return M.floorHallway
    default:         return M.floorDefault
  }
}

// ── Box helper ────────────────────────────────────────────────────────────────
function B({ p, s, m, rot }) {
  return (
    <mesh position={p} rotation={rot} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  )
}

// ── Floor ─────────────────────────────────────────────────────────────────────
function RoomFloor({ room }) {
  const cx = ft(room.x + room.width / 2)
  const cz = ft(room.y + room.depth / 2)
  const base = room.floor * WALL_H
  return (
    <mesh position={[cx, base + 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat(room.type)}>
      <planeGeometry args={[ft(room.width), ft(room.depth)]} />
    </mesh>
  )
}

// ── Ceiling ───────────────────────────────────────────────────────────────────
function RoomCeiling({ room }) {
  const cx = ft(room.x + room.width / 2)
  const cz = ft(room.y + room.depth / 2)
  const top = room.floor * WALL_H + WALL_H
  return (
    <mesh position={[cx, top - 0.01, cz]} rotation={[Math.PI / 2, 0, 0]} material={M.ceiling}>
      <planeGeometry args={[ft(room.width), ft(room.depth)]} />
    </mesh>
  )
}

// ── Crown molding ─────────────────────────────────────────────────────────────
function CrownMolding({ room }) {
  const x0 = ft(room.x), x1 = ft(room.x + room.width)
  const z0 = ft(room.y), z1 = ft(room.y + room.depth)
  const y  = room.floor * WALL_H + WALL_H - 0.08
  const mH = 0.06, mW = 0.08
  return (
    <group>
      <B p={[(x0+x1)/2, y, z0]} s={[x1-x0+mW, mH, mW]} m={M.woodTrim} />
      <B p={[(x0+x1)/2, y, z1]} s={[x1-x0+mW, mH, mW]} m={M.woodTrim} />
      <B p={[x0, y, (z0+z1)/2]} s={[mW, mH, z1-z0-mW]} m={M.woodTrim} />
      <B p={[x1, y, (z0+z1)/2]} s={[mW, mH, z1-z0-mW]} m={M.woodTrim} />
    </group>
  )
}

// ── Skirting board ────────────────────────────────────────────────────────────
function SkirtingBoard({ room }) {
  const x0 = ft(room.x), x1 = ft(room.x + room.width)
  const z0 = ft(room.y), z1 = ft(room.y + room.depth)
  const y  = room.floor * WALL_H + 0.075
  const sH = 0.15, sW = 0.04
  return (
    <group>
      <B p={[(x0+x1)/2, y, z0]} s={[x1-x0, sH, sW]} m={M.woodTrim} />
      <B p={[(x0+x1)/2, y, z1]} s={[x1-x0, sH, sW]} m={M.woodTrim} />
      <B p={[x0, y, (z0+z1)/2]} s={[sW, sH, z1-z0]} m={M.woodTrim} />
      <B p={[x1, y, (z0+z1)/2]} s={[sW, sH, z1-z0]} m={M.woodTrim} />
    </group>
  )
}

// ── Walls (determine exterior vs interior per side) ───────────────────────────
function adjRoom(room, wall, allRooms) {
  const x0 = ft(room.x), x1 = ft(room.x + room.width)
  const z0 = ft(room.y), z1 = ft(room.y + room.depth)
  return allRooms.some((r) => {
    if (r.id === room.id || r.floor !== room.floor) return false
    const rx0 = ft(r.x), rx1 = ft(r.x + r.width)
    const rz0 = ft(r.y), rz1 = ft(r.y + r.depth)
    if (wall === 'north') return Math.abs(rz1 - z0) < 0.08 && rx0 < x1 - 0.05 && rx1 > x0 + 0.05
    if (wall === 'south') return Math.abs(rz0 - z1) < 0.08 && rx0 < x1 - 0.05 && rx1 > x0 + 0.05
    if (wall === 'west')  return Math.abs(rx1 - x0) < 0.08 && rz0 < z1 - 0.05 && rz1 > z0 + 0.05
    if (wall === 'east')  return Math.abs(rx0 - x1) < 0.08 && rz0 < z1 - 0.05 && rz1 > z0 + 0.05
    return false
  })
}

function RoomWalls({ room, allRooms }) {
  const x0 = ft(room.x), x1 = ft(room.x + room.width)
  const z0 = ft(room.y), z1 = ft(room.y + room.depth)
  const base = room.floor * WALL_H
  const cy   = base + WALL_H / 2

  const sides = [
    { id: 'north', ext: !adjRoom(room,'north',allRooms), pos: [(x0+x1)/2, cy, z0], size: [x1-x0, WALL_H, WALL_T] },
    { id: 'south', ext: !adjRoom(room,'south',allRooms), pos: [(x0+x1)/2, cy, z1], size: [x1-x0, WALL_H, WALL_T] },
    { id: 'west',  ext: !adjRoom(room,'west', allRooms), pos: [x0, cy, (z0+z1)/2],  size: [WALL_T, WALL_H, z1-z0] },
    { id: 'east',  ext: !adjRoom(room,'east', allRooms), pos: [x1, cy, (z0+z1)/2],  size: [WALL_T, WALL_H, z1-z0] },
  ]
  return (
    <group>
      {sides.map((w) => (
        <mesh key={w.id} position={w.pos} material={w.ext ? M.brickWall : M.plasterWall} castShadow receiveShadow>
          <boxGeometry args={w.size} />
        </mesh>
      ))}
      {room.windows?.map((wall) => <WindowOnWall key={wall} wall={wall} room={room} />)}
    </group>
  )
}

// ── Window ────────────────────────────────────────────────────────────────────
function WindowOnWall({ wall, room }) {
  const x0 = ft(room.x), x1 = ft(room.x + room.width)
  const z0 = ft(room.y), z1 = ft(room.y + room.depth)
  const base = room.floor * WALL_H
  const wW = ft(Math.min(room.width, room.depth) * 0.38)
  const wH = ft(5.5)
  const wY = base + ft(4.2)
  const fT = 0.06

  let cx, cz, horiz
  if (wall === 'north')      { cx = (x0+x1)/2; cz = z0; horiz = true }
  else if (wall === 'south') { cx = (x0+x1)/2; cz = z1; horiz = true }
  else if (wall === 'west')  { cx = x0; cz = (z0+z1)/2; horiz = false }
  else                       { cx = x1; cz = (z0+z1)/2; horiz = false }

  const glassS = horiz ? [wW-fT*2, wH-fT*2, 0.04] : [0.04, wH-fT*2, wW-fT*2]

  return (
    <group position={[cx, wY, cz]}>
      {horiz ? (
        <>
          <B p={[0, wH/2, 0]}   s={[wW, fT, fT]} m={M.winFrame} />
          <B p={[0, -wH/2, 0]}  s={[wW, fT, fT]} m={M.winFrame} />
          <B p={[-wW/2, 0, 0]}  s={[fT, wH, fT]} m={M.winFrame} />
          <B p={[wW/2, 0, 0]}   s={[fT, wH, fT]} m={M.winFrame} />
          <B p={[0, 0, 0]}      s={[fT, wH, fT]} m={M.winFrame} />
        </>
      ) : (
        <>
          <B p={[0, wH/2, 0]}   s={[fT, fT, wW]} m={M.winFrame} />
          <B p={[0, -wH/2, 0]}  s={[fT, fT, wW]} m={M.winFrame} />
          <B p={[0, 0, -wW/2]}  s={[fT, wH, fT]} m={M.winFrame} />
          <B p={[0, 0, wW/2]}   s={[fT, wH, fT]} m={M.winFrame} />
          <B p={[0, 0, 0]}      s={[fT, wH, fT]} m={M.winFrame} />
        </>
      )}
      <mesh material={M.glass}><boxGeometry args={glassS} /></mesh>
    </group>
  )
}

// ── Door trim ─────────────────────────────────────────────────────────────────
function DoorTrim({ room }) {
  const { door } = room
  if (!door) return null
  const x0 = ft(room.x), x1 = ft(room.x + room.width)
  const z0 = ft(room.y)
  const base = room.floor * WALL_H
  const dW = ft(3), dH = ft(7), fT = 0.06
  const off = ft(door.offset ?? 1)

  let cx, cz, horiz
  if (door.wall === 'north')      { cx = x0+off; cz = ft(room.y); horiz = true }
  else if (door.wall === 'south') { cx = x0+off; cz = ft(room.y+room.depth); horiz = true }
  else if (door.wall === 'west')  { cx = ft(room.x); cz = z0+off; horiz = false }
  else                            { cx = ft(room.x+room.width); cz = z0+off; horiz = false }

  return (
    <group position={[cx, base, cz]}>
      {horiz ? (
        <>
          <B p={[-dW/2, dH/2, 0]} s={[fT, dH, fT]} m={M.woodTrim} />
          <B p={[ dW/2, dH/2, 0]} s={[fT, dH, fT]} m={M.woodTrim} />
          <B p={[0, dH, 0]}       s={[dW+fT, fT, fT]} m={M.woodTrim} />
        </>
      ) : (
        <>
          <B p={[0, dH/2, -dW/2]} s={[fT, dH, fT]} m={M.woodTrim} />
          <B p={[0, dH/2,  dW/2]} s={[fT, dH, fT]} m={M.woodTrim} />
          <B p={[0, dH, 0]}       s={[fT, fT, dW+fT]} m={M.woodTrim} />
        </>
      )}
    </group>
  )
}

// ── Room point light ──────────────────────────────────────────────────────────
function RoomLight({ room }) {
  const cx = ft(room.x + room.width / 2)
  const cz = ft(room.y + room.depth / 2)
  const ly = room.floor * WALL_H + WALL_H - 0.4
  return (
    <pointLight
      position={[cx, ly, cz]}
      intensity={12}
      distance={ft(Math.max(room.width, room.depth) * 2)}
      color="#FFF5E0"
    />
  )
}

// ── FURNITURE ─────────────────────────────────────────────────────────────────
function LivingFurniture({ room }) {
  const cx = ft(room.x + room.width / 2), cz = ft(room.y + room.depth / 2)
  const base = room.floor * WALL_H
  return (
    <group position={[cx, base, cz]}>
      {/* Chesterfield sofa */}
      <B p={[0,0.25,-ft(4)]} s={[ft(9),0.50,ft(3)]} m={M.chesterfield} />
      <B p={[0,0.60,-ft(5.2)]} s={[ft(9),0.70,0.60]} m={M.chesterfield} />
      <B p={[-ft(4.2),0.50,-ft(4)]} s={[0.60,0.80,ft(3)]} m={M.chesterfield} />
      <B p={[ ft(4.2),0.50,-ft(4)]} s={[0.60,0.80,ft(3)]} m={M.chesterfield} />
      {/* Armchair left */}
      <B p={[-ft(5.5),0.25,-ft(2)]} s={[ft(3),0.50,ft(3)]} m={M.chesterfield} />
      <B p={[-ft(5.5),0.60,-ft(3.3)]} s={[ft(3),0.70,0.50]} m={M.chesterfield} />
      {/* Armchair right */}
      <B p={[ft(5.5),0.25,-ft(2)]} s={[ft(3),0.50,ft(3)]} m={M.chesterfield} />
      <B p={[ft(5.5),0.60,-ft(3.3)]} s={[ft(3),0.70,0.50]} m={M.chesterfield} />
      {/* Coffee table */}
      <B p={[0,0.30,-ft(2)]} s={[ft(4),0.08,ft(2)]} m={M.darkWood} />
      {[[-ft(1.8),-ft(1)],[ft(1.8),-ft(1)],[-ft(1.8),-ft(3)],[ft(1.8),-ft(3)]].map(([px,pz],i)=>(
        <B key={i} p={[px,0.15,pz]} s={[0.07,0.30,0.07]} m={M.darkWood} />
      ))}
      {/* Fireplace */}
      <B p={[0,ft(2),ft(6)]} s={[ft(6),ft(4),ft(0.5)]} m={M.fireBrick} />
      <B p={[0,ft(1.5),ft(5.8)]} s={[ft(4),ft(3),0.10]} m={M.fireOpen} />
      <B p={[0,ft(3.5),ft(5.6)]} s={[ft(7),0.10,ft(0.8)]} m={M.darkWood} />
      {/* Bookcase */}
      <B p={[-ft(6),ft(3.5),ft(5)]} s={[ft(3),ft(7),ft(1)]} m={M.darkWood} />
    </group>
  )
}

function DiningFurniture({ room }) {
  const cx = ft(room.x + room.width / 2), cz = ft(room.y + room.depth / 2)
  const base = room.floor * WALL_H
  return (
    <group position={[cx, base, cz]}>
      <B p={[0,0.76,0]} s={[ft(7),0.08,ft(3.5)]} m={M.darkWood} />
      {[-ft(3),-ft(1.5),0,ft(1.5),ft(3)].map((x,i)=>(
        <B key={i} p={[x,0.38,0]} s={[0.07,0.76,0.07]} m={M.darkWood} />
      ))}
      {[[-ft(4),0,ft(0.7)],[-ft(4),0,-ft(0.7)],[ft(4),0,ft(0.7)],[ft(4),0,-ft(0.7)],
        [-ft(1.5),0,ft(2.5)],[0,0,ft(2.5)],[ft(1.5),0,ft(2.5)],
        [-ft(1.5),0,-ft(2.5)],[0,0,-ft(2.5)],[ft(1.5),0,-ft(2.5)]].map((p,i)=>(
        <group key={i} position={p}>
          <B p={[0,0.45,0]} s={[ft(1.5),0.90,ft(1.5)]} m={M.fabric} />
          <B p={[0,1.10,0]} s={[ft(1.5),0.80,0.06]} m={M.darkWood} />
        </group>
      ))}
      <B p={[0,0.45,ft(5.5)]} s={[ft(6),0.90,ft(1.5)]} m={M.darkWood} />
    </group>
  )
}

function KitchenFurniture({ room }) {
  const x0 = ft(room.x), z0 = ft(room.y)
  const w = ft(room.width), d = ft(room.depth)
  const base = room.floor * WALL_H
  const cH = 0.9, cD = ft(2), cT = 0.04
  return (
    <group position={[0, base, 0]}>
      <B p={[x0+w/2, cH/2, z0+cD/2]} s={[w-cD, cH, cD]} m={M.lightWood} />
      <B p={[x0+w/2, cH+cT/2, z0+cD/2]} s={[w-cD, cT, cD]} m={M.counterTop} />
      <B p={[x0+w-cD/2, cH/2, z0+d/2]} s={[cD, cH, d-cD]} m={M.lightWood} />
      <B p={[x0+w-cD/2, cH+cT/2, z0+d/2]} s={[cD, cT, d-cD]} m={M.counterTop} />
      <B p={[x0+w/2, cH/2, z0+d*0.6]} s={[ft(5), cH, ft(2.5)]} m={M.lightWood} />
      <B p={[x0+w/2, cH+cT/2, z0+d*0.6]} s={[ft(5), cT, ft(2.5)]} m={M.marble} />
      <B p={[x0+w/2, WALL_H-ft(2), z0+0.30]} s={[w-cD, ft(2.5), ft(1.3)]} m={M.lightWood} />
    </group>
  )
}

function BedroomFurniture({ room, isMaster }) {
  const cx = ft(room.x + room.width / 2), cz = ft(room.y + room.depth / 2)
  const base = room.floor * WALL_H
  const bW = isMaster ? ft(7) : ft(5.5)
  const bD = ft(6.5)
  return (
    <group position={[cx, base, cz]}>
      <B p={[0,0.25,ft(1)]} s={[bW,0.50,bD]} m={M.darkWood} />
      <B p={[0,0.65,ft(1)]} s={[bW-0.1,0.40,bD-0.1]} m={M.bedLinens} />
      <B p={[-bW/4,0.90,ft(1)-bD/2+0.3]} s={[bW/3,0.15,0.40]} m={M.bedLinens} />
      <B p={[ bW/4,0.90,ft(1)-bD/2+0.3]} s={[bW/3,0.15,0.40]} m={M.bedLinens} />
      {[[-bW/2,bD/2],[bW/2,bD/2],[-bW/2,-bD/2],[bW/2,-bD/2]].map(([px,pz],i)=>(
        <B key={i} p={[px,ft(3.5),ft(1)+pz]} s={[0.10,ft(7),0.10]} m={M.darkWood} />
      ))}
      <B p={[0,ft(7.2),ft(1)]} s={[bW+0.1,0.06,bD+0.1]} m={M.darkWood} />
      <B p={[0,ft(3),ft(1)-bD/2]} s={[bW,ft(4),0.10]} m={M.darkWood} />
      <B p={[-bW/2-0.5,0.60,ft(1)-bD/4]} s={[ft(1.5),1.2,ft(1.5)]} m={M.darkWood} />
      <B p={[ bW/2+0.5,0.60,ft(1)-bD/4]} s={[ft(1.5),1.2,ft(1.5)]} m={M.darkWood} />
      <B p={[0,ft(4),-ft(3.5)]} s={[ft(6),ft(8),ft(1.8)]} m={M.darkWood} />
    </group>
  )
}

function BathFurniture({ room }) {
  const x0 = ft(room.x), z0 = ft(room.y)
  const w = ft(room.width), d = ft(room.depth)
  const base = room.floor * WALL_H
  return (
    <group position={[0, base, 0]}>
      <B p={[x0+ft(3),0.45,z0+d/2]} s={[ft(5),0.90,ft(2.5)]} m={M.porcelain} />
      {[[-ft(2),-ft(1)],[ft(2),-ft(1)],[-ft(2),ft(1)],[ft(2),ft(1)]].map(([px,pz],i)=>(
        <B key={i} p={[x0+ft(3)+px,0.15,z0+d/2+pz]} s={[0.08,0.30,0.08]} m={M.brass} />
      ))}
      <B p={[x0+w-ft(2),0.85,z0+ft(2)]} s={[ft(2),0.10,ft(1.5)]} m={M.porcelain} />
      <B p={[x0+w-ft(2),0.40,z0+ft(2)]} s={[0.10,0.85,0.10]} m={M.porcelain} />
      <mesh position={[x0+w-ft(2),1.60,z0+ft(1.9)]} material={M.glass}>
        <boxGeometry args={[ft(1.8),ft(2.5),0.05]} />
      </mesh>
      <B p={[x0+ft(1.5),0.35,z0+ft(2)]} s={[ft(1.5),0.70,ft(2)]} m={M.porcelain} />
      <B p={[x0+ft(1.5),0.75,z0+ft(1)]} s={[ft(1.5),0.15,ft(0.6)]} m={M.porcelain} />
    </group>
  )
}

function HallwayFurniture({ room }) {
  const x0 = ft(room.x), z0 = ft(room.y)
  const w = ft(room.width), d = ft(room.depth)
  const base = room.floor * WALL_H
  return (
    <group position={[0, base, 0]}>
      <B p={[x0+ft(4),0.75,z0+ft(1)]} s={[ft(3),1.5,ft(1)]} m={M.darkWood} />
      {[0,1,2,3,4].map((i)=>(
        <B key={i} p={[x0+ft(10)+ft(i*2.5),ft(5.5),z0+ft(0.2)]} s={[0.06,0.06,ft(0.5)]} m={M.brass} />
      ))}
      <B p={[x0+ft(2),0.50,z0+ft(0.5)]} s={[ft(0.5),1.0,ft(0.5)]} m={M.brass} />
      <mesh position={[x0+w/2,0.015,z0+d/2]} rotation={[-Math.PI/2,0,0]} material={M.rug}>
        <planeGeometry args={[w*0.6, d*0.5]} />
      </mesh>
    </group>
  )
}

function RoomFurniture({ room, bedIndex }) {
  switch (room.type) {
    case 'living':   return <LivingFurniture  room={room} />
    case 'dining':   return <DiningFurniture  room={room} />
    case 'kitchen':  return <KitchenFurniture room={room} />
    case 'bedroom':  return <BedroomFurniture room={room} isMaster={bedIndex === 0} />
    case 'bathroom': return <BathFurniture    room={room} />
    case 'hallway':  return <HallwayFurniture room={room} />
    default:         return null
  }
}

// ── Victorian gabled roof (built with imperative Three.js geometry) ────────────
function VictorianRoof({ house }) {
  const { plotWidth, plotDepth } = house.meta
  const hasFloor1 = house.rooms.some((r) => r.floor === 1)
  const W  = ft(plotWidth), D = ft(plotDepth)
  const rY = hasFloor1 ? WALL_H * 2 : WALL_H
  const rH = ft(14)   // ridge height
  const ov = ft(2)    // overhang

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    // Ridge runs E-W at x=W/2, from z=0 to z=D
    // Eaves at y=0 (world y = rY + 0)
    // Ridge at y=rH (world y = rY + rH)
    const p = new Float32Array([
      // North slope: north eave edge → ridge
      -ov,  0, -ov,     W+ov, 0, -ov,     W/2, rH, 0,
      W/2, rH, 0,        -ov, 0, -ov,
      // South slope
      -ov, 0, D+ov,    W/2, rH, D,    W+ov, 0, D+ov,
      W/2, rH, D,       W+ov, 0, D+ov,
      // West gable
      -ov, 0, -ov,   W/2, rH, 0,   W/2, rH, D,   -ov, 0, D+ov,
      // East gable
      W+ov, 0, -ov,  W+ov, 0, D+ov, W/2, rH, D,  W/2, rH, 0,
    ])

    // North slope (2 tris)
    const nsV = [-ov,0,-ov, W+ov,0,-ov, W/2,rH,0, W/2,rH,D, -ov,0,D+ov,  W+ov,0,D+ov]

    // Build via Shape + ExtrudeGeometry is complex; use manual vertices instead
    const verts = []
    const addTri = (ax,ay,az, bx,by,bz, cx,cy,cz) => {
      verts.push(ax,ay,az, bx,by,bz, cx,cy,cz)
    }
    // North slope
    addTri(-ov,0,-ov,  W+ov,0,-ov,  W/2,rH,0)
    // South slope
    addTri(-ov,0,D+ov,  W/2,rH,D,  W+ov,0,D+ov)
    // North slope to ridge (rear half)
    addTri(W/2,rH,0,  W+ov,0,-ov,  W+ov,0,D+ov)
    addTri(W/2,rH,0,  W+ov,0,D+ov, W/2,rH,D)
    addTri(W/2,rH,0,  -ov,0,-ov,   -ov,0,D+ov)
    addTri(W/2,rH,0,  -ov,0,D+ov,  W/2,rH,D)
    // West gable
    addTri(-ov,0,-ov,  W/2,rH,0,   W/2,rH,D)
    addTri(-ov,0,-ov,  W/2,rH,D,   -ov,0,D+ov)
    // East gable
    addTri(W+ov,0,-ov,  W+ov,0,D+ov,  W/2,rH,D)
    addTri(W+ov,0,-ov,  W/2,rH,D,     W/2,rH,0)

    const arr = new Float32Array(verts)
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    g.computeVertexNormals()
    return g
  }, [W, D, rH, ov, rY])

  return (
    <group position={[0, rY, 0]}>
      <mesh geometry={geo} material={M.roofTile} castShadow receiveShadow />
      {/* Chimneys */}
      <B p={[W*0.3, rH*0.5, D*0.2]} s={[ft(2.5),ft(5.5),ft(1.8)]} m={M.chimney} />
      <B p={[W*0.7, rH*0.5, D*0.25]} s={[ft(2.5),ft(5.5),ft(1.8)]} m={M.chimney} />
    </group>
  )
}

// ── Ground ────────────────────────────────────────────────────────────────────
function Ground({ W, D }) {
  return (
    <mesh rotation={[-Math.PI/2,0,0]} position={[W/2,-0.02,D/2]} receiveShadow material={M.ground}>
      <planeGeometry args={[W*3, D*3]} />
    </mesh>
  )
}

// ── Pool ──────────────────────────────────────────────────────────────────────
function Pool({ features }) {
  if (!features?.pool) return null
  const { poolX, poolY, poolW, poolD } = features
  const cx = ft(poolX+poolW/2), cz = ft(poolY+poolD/2)
  return (
    <group>
      <mesh position={[cx,0.05,cz]} rotation={[-Math.PI/2,0,0]} material={M.poolWater}>
        <planeGeometry args={[ft(poolW),ft(poolD)]} />
      </mesh>
      <B p={[cx,0.15,cz]} s={[ft(poolW)+0.4,0.3,ft(poolD)+0.4]} m={M.poolDeck} />
    </group>
  )
}

// ── Walk mode (WASD + click-drag to look, no pointer lock needed) ─────────────
function WalkMode({ house }) {
  const { camera } = useThree()
  const keys  = useRef({})
  const mouse = useRef({ down: false, x: 0, y: 0 })
  const yaw   = useRef(Math.PI)  // start facing south (into the house)
  const pitch = useRef(-0.1)

  useEffect(() => {
    const hall = house.rooms.find((r) => r.type === 'hallway' && r.floor === 0) ?? house.rooms[0]
    camera.position.set(ft(hall.x + hall.width / 2), EYE_H, ft(hall.y + hall.depth / 2))
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current
  }, [])

  useEffect(() => {
    const dn  = (e) => { keys.current[e.code] = true }
    const up  = (e) => { keys.current[e.code] = false }
    const mdn = (e) => { mouse.current = { down: true, x: e.clientX, y: e.clientY } }
    const mup = ()  => { mouse.current.down = false }
    const mmv = (e) => {
      if (!mouse.current.down) return
      yaw.current   -= (e.clientX - mouse.current.x) * 0.003
      pitch.current -= (e.clientY - mouse.current.y) * 0.003
      pitch.current  = Math.max(-1.4, Math.min(1.4, pitch.current))
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
    }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    window.addEventListener('mousedown', mdn)
    window.addEventListener('mouseup',   mup)
    window.addEventListener('mousemove', mmv)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup',   up)
      window.removeEventListener('mousedown', mdn)
      window.removeEventListener('mouseup',   mup)
      window.removeEventListener('mousemove', mmv)
    }
  }, [])

  useFrame((_, dt) => {
    const speed = 4
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current

    const fwd = new THREE.Vector3()
    const rgt = new THREE.Vector3()
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize()
    rgt.crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()

    const dir = new THREE.Vector3()
    if (keys.current['KeyW'] || keys.current['ArrowUp'])    dir.addScaledVector(fwd,  1)
    if (keys.current['KeyS'] || keys.current['ArrowDown'])  dir.addScaledVector(fwd, -1)
    if (keys.current['KeyA'] || keys.current['ArrowLeft'])  dir.addScaledVector(rgt, -1)
    if (keys.current['KeyD'] || keys.current['ArrowRight']) dir.addScaledVector(rgt,  1)
    if (dir.lengthSq() > 0) dir.normalize()
    camera.position.addScaledVector(dir, speed * dt)
    camera.position.y = EYE_H
  })

  return null
}

// ── Full scene ────────────────────────────────────────────────────────────────
function Scene({ house, mode }) {
  const { plotWidth, plotDepth } = house.meta
  const W = ft(plotWidth), D = ft(plotDepth)

  // Pre-compute bedroom index so we don't mutate during render
  let bi = 0
  const bedIndices = {}
  house.rooms.forEach((r) => {
    if (r.type === 'bedroom') { bedIndices[r.id] = bi++ }
  })

  return (
    <>
      <color attach="background" args={['#87CEEB']} />
      <fog attach="fog" args={['#c9e8f7', 30, 160]} />

      <ambientLight intensity={0.45} color="#fff8f0" />
      <directionalLight
        position={[W*0.5+20, 35, -15]}
        intensity={2.2}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[2048,2048]}
        shadow-camera-left={-50} shadow-camera-right={50}
        shadow-camera-top={60}   shadow-camera-bottom={-60}
        shadow-camera-far={150}
      />
      <directionalLight position={[-20, 20, D+20]} intensity={0.5} color="#d0e8ff" />

      <Ground W={W} D={D} />
      <Pool features={house.features} />

      {house.rooms.map((room) => (
        <group key={room.id}>
          <RoomFloor   room={room} />
          <RoomCeiling room={room} />
          <RoomWalls   room={room} allRooms={house.rooms} />
          <CrownMolding  room={room} />
          <SkirtingBoard room={room} />
          <DoorTrim    room={room} />
          <RoomLight   room={room} />
          <RoomFurniture room={room} bedIndex={bedIndices[room.id] ?? -1} />
        </group>
      ))}

      <VictorianRoof house={house} />

      {mode === 'walk' ? (
        <WalkMode house={house} />
      ) : (
        <>
          <OrbitControls
            target={[W/2, 0, D/2]}
            minDistance={3}
            maxDistance={180}
            maxPolarAngle={Math.PI / 2.05}
          />
          <GizmoHelper alignment="bottom-right" margin={[80,80]}>
            <GizmoViewport labelColor="white" axisHeadScale={1} />
          </GizmoHelper>
        </>
      )}
    </>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function ThreeDView() {
  const house = useHouseStore((s) => s.house)
  const [mode, setMode] = useState('orbit')

  if (!house) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Generate a house to see the 3D view
      </div>
    )
  }

  const { plotWidth, plotDepth } = house.meta
  const startX = ft(plotWidth * 0.7)
  const startY = ft(35)
  const startZ = ft(-15)

  return (
    <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        shadows
        camera={{ fov: 60, near: 0.1, far: 600, position: [startX, startY, startZ] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Scene house={house} mode={mode} />
      </Canvas>

      {/* Overlay */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <button
          onClick={() => setMode((m) => m === 'orbit' ? 'walk' : 'orbit')}
          className="px-3 py-2 text-xs font-semibold rounded-lg shadow-lg
                     bg-gray-900/85 text-white hover:bg-gray-800 backdrop-blur transition-colors"
        >
          {mode === 'orbit' ? '🚶 Walk Mode' : '🔭 Orbit Mode'}
        </button>
        {mode === 'walk' && (
          <div className="px-3 py-2 text-xs rounded-lg bg-black/75 text-gray-200 backdrop-blur leading-5">
            <div className="font-semibold mb-1">Walk Controls</div>
            <div>W A S D / arrows — move</div>
            <div>Click + drag — look around</div>
          </div>
        )}
      </div>

      {mode === 'orbit' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70
                        bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 pointer-events-none">
          Drag to rotate · Scroll to zoom · Right-drag to pan
        </div>
      )}
    </div>
  )
}
