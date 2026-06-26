import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Text } from 'react-konva';
import useImage from 'use-image';
import { dbService } from '../../services/firebaseService';
import { getCacheBustedUrl } from '../../lib/utils';
import { Download, Image as ImageIcon, Type, Trash2, Maximize } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type ElementType = 'IMAGE' | 'TEXT';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  src?: string; // For images
  text?: string; // For text
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
}

interface LayoutEditorProps {
  onSave?: (base64Data: string) => void;
  onCancel?: () => void;
}

const URLImage = ({ element, isSelected, onSelect, onChange }: any) => {
  const [image] = useImage(getCacheBustedUrl(element.src), 'anonymous');
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <KonvaImage
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...element}
        image={image}
        draggable={true}
        shadowOffset={{
            x: element.shadowOffsetX || 0,
            y: element.shadowOffsetY || 0
        }}
        onDragEnd={(e) => {
          onChange({
            ...element,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...element,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

const CustomText = ({ element, isSelected, onSelect, onChange }: any) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Text
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...element}
        draggable={true}
        shadowOffset={{
            x: element.shadowOffsetX || 0,
            y: element.shadowOffsetY || 0
        }}
        onDragEnd={(e) => {
          onChange({
            ...element,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...element,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            scaleX: scaleX,
            scaleY: scaleY
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export const LayoutEditor: React.FC<LayoutEditorProps> = ({ onSave, onCancel }) => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, selectShape] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const stageRef = useRef<any>(null);
  const [bgImage, setBgImage] = useState<CanvasElement | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });

  useEffect(() => {
    const unsubscribe = dbService.subscribeToCollection('media_assets', (data) => {
      setAssets(data);
    });
    return () => unsubscribe();
  }, []);

  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  const addImage = (url: string) => {
    const newElement: CanvasElement = {
      id: uuidv4(),
      type: 'IMAGE',
      x: 50,
      y: 50,
      width: 150,
      height: 150,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      src: url,
    };
    setElements([...elements, newElement]);
  };

  const setBackground = (url: string) => {
    setBgImage({
      id: 'bg-image',
      type: 'IMAGE',
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      src: url,
      opacity: 1,
    });
  };

  const addText = () => {
    const newElement: CanvasElement = {
      id: uuidv4(),
      type: 'TEXT',
      x: 50,
      y: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      text: 'New Text',
      fontSize: 24,
      fontFamily: 'Poppins',
      fill: '#000000',
      opacity: 1,
      stroke: '#000000',
      strokeWidth: 0,
    };
    setElements([...elements, newElement]);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(elements.filter((el) => el.id !== selectedId));
      selectShape(null);
    }
  };

  const exportAndSave = () => {
    if (stageRef.current) {
        selectShape(null); // Deselect before export to remove transformer boxes
        setTimeout(() => {
            const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 }); // High-res export
            if (onSave) {
                onSave(dataURL);
            }
        }, 100);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white p-4 rounded-xl border border-gray-200">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                <span className="flex items-center">
                    <Maximize className="w-4 h-4 mr-2" />
                    Canvas Size
                </span>
            </h3>
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setCanvasSize({ width: 500, height: 500 })}
                    className={`flex-1 py-1 text-xs font-medium rounded border ${canvasSize.width === canvasSize.height ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-300 text-gray-600'}`}
                >
                    1:1
                </button>
                <button
                    onClick={() => setCanvasSize({ width: 400, height: 500 })}
                    className={`flex-1 py-1 text-xs font-medium rounded border ${canvasSize.width === 400 ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-300 text-gray-600'}`}
                >
                    4:5
                </button>
            </div>

            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                Library Assets
            </h3>

            <div className="space-y-4">
                <div>
                    <span className="text-xs font-medium text-gray-500 mb-2 block">Backgrounds</span>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-1">
                        {assets.filter(a => a.type === 'PHOTO').map(asset => (
                            <img
                                key={asset.id}
                                src={getCacheBustedUrl(asset.url)}
                                alt={asset.name}
                                crossOrigin="anonymous"
                                className="w-full h-16 object-cover rounded cursor-pointer hover:ring-2 hover:ring-purple-500"
                                onClick={() => setBackground(asset.url)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <span className="text-xs font-medium text-gray-500 mb-2 block">Logos & Components</span>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-1">
                        {assets.filter(a => a.type === 'LOGO' || a.type === 'COMPONENT').map(asset => (
                            <img
                                key={asset.id}
                                src={getCacheBustedUrl(asset.url)}
                                alt={asset.name}
                                crossOrigin="anonymous"
                                className="w-full h-16 object-contain bg-white border border-gray-100 rounded cursor-pointer hover:ring-2 hover:ring-purple-500 p-1"
                                onClick={() => addImage(asset.url)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center">
                <Type className="w-4 h-4 mr-2" />
                Tools
            </h3>

            <button
                onClick={addText}
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded transition-colors flex items-center justify-center text-sm"
            >
                <Type className="w-4 h-4 mr-2" />
                Add Text
            </button>

            {selectedId && (
                <div className="mt-2 space-y-3">
                    {elements.find(el => el.id === selectedId)?.type === 'TEXT' && (
                        <>
                            <div>
                                <span className="text-xs font-medium text-gray-500 mb-1 block">Text Content</span>
                                <input
                                    type="text"
                                    value={elements.find(el => el.id === selectedId)?.text || ''}
                                    onChange={(e) => {
                                        const newText = e.target.value;
                                        setElements(elements.map(el =>
                                            el.id === selectedId ? { ...el, text: newText } : el
                                        ));
                                    }}
                                    className="w-full border border-gray-300 rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs font-medium text-gray-500 mb-1 block">Font Family</span>
                                    <select
                                        value={elements.find(el => el.id === selectedId)?.fontFamily || 'Poppins'}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setElements(elements.map(el =>
                                                el.id === selectedId ? { ...el, fontFamily: newVal } : el
                                            ));
                                        }}
                                        className="w-full border border-gray-300 rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                        <option value="Poppins">Poppins</option>
                                        <option value="Philosopher">Philosopher</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Montserrat">Montserrat</option>
                                    </select>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-gray-500 mb-1 block">Text Color</span>
                                    <input
                                        type="color"
                                        value={elements.find(el => el.id === selectedId)?.fill || '#000000'}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setElements(elements.map(el =>
                                                el.id === selectedId ? { ...el, fill: newVal } : el
                                            ));
                                        }}
                                        className="w-full h-8 border border-gray-300 rounded p-0.5 outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs font-medium text-gray-500 mb-1 block">Stroke Color</span>
                                    <input
                                        type="color"
                                        value={elements.find(el => el.id === selectedId)?.stroke || '#000000'}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setElements(elements.map(el =>
                                                el.id === selectedId ? { ...el, stroke: newVal } : el
                                            ));
                                        }}
                                        className="w-full h-8 border border-gray-300 rounded p-0.5 outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-gray-500 mb-1 block">Stroke Width</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        value={elements.find(el => el.id === selectedId)?.strokeWidth || 0}
                                        onChange={(e) => {
                                            const newVal = parseInt(e.target.value);
                                            setElements(elements.map(el =>
                                                el.id === selectedId ? { ...el, strokeWidth: newVal } : el
                                            ));
                                        }}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs font-medium text-gray-500 mb-1 block">Shadow Color</span>
                                    <input
                                        type="color"
                                        value={elements.find(el => el.id === selectedId)?.shadowColor || '#000000'}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setElements(elements.map(el =>
                                                el.id === selectedId ? { ...el, shadowColor: newVal, shadowOpacity: 0.5 } : el
                                            ));
                                        }}
                                        className="w-full h-8 border border-gray-300 rounded p-0.5 outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-gray-500 mb-1 block">Shadow Blur</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="20"
                                        value={elements.find(el => el.id === selectedId)?.shadowBlur || 0}
                                        onChange={(e) => {
                                            const newVal = parseInt(e.target.value);
                                            setElements(elements.map(el =>
                                                el.id === selectedId ? {
                                                    ...el,
                                                    shadowBlur: newVal,
                                                    shadowOffsetX: newVal > 0 ? 5 : 0,
                                                    shadowOffsetY: newVal > 0 ? 5 : 0,
                                                    shadowOpacity: newVal > 0 ? 0.5 : 0
                                                } : el
                                            ));
                                        }}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="pt-2 border-t border-gray-200 space-y-3">
                        <div>
                            <span className="text-xs font-medium text-gray-500 mb-1 block">Opacity</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={
                                    selectedId === 'bg-image'
                                        ? bgImage?.opacity ?? 1
                                        : elements.find(el => el.id === selectedId)?.opacity ?? 1
                                }
                                onChange={(e) => {
                                    const newVal = parseFloat(e.target.value);
                                    if (selectedId === 'bg-image') {
                                        setBgImage(prev => prev ? { ...prev, opacity: newVal } : null);
                                    } else {
                                        setElements(elements.map(el =>
                                            el.id === selectedId ? { ...el, opacity: newVal } : el
                                        ));
                                    }
                                }}
                                className="w-full"
                            />
                        </div>

                        {selectedId !== 'bg-image' && (
                            <div>
                                <span className="text-xs font-medium text-gray-500 mb-2 block">Layering</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const index = elements.findIndex(el => el.id === selectedId);
                                            if (index > 0) {
                                                const newElements = [...elements];
                                                const temp = newElements[index];
                                                newElements[index] = newElements[index - 1];
                                                newElements[index - 1] = temp;
                                                setElements(newElements);
                                            }
                                        }}
                                        className="flex-1 bg-white border border-gray-300 py-1.5 rounded text-xs font-medium hover:bg-gray-50 flex items-center justify-center"
                                    >
                                        Move Back
                                    </button>
                                    <button
                                        onClick={() => {
                                            const index = elements.findIndex(el => el.id === selectedId);
                                            if (index < elements.length - 1) {
                                                const newElements = [...elements];
                                                const temp = newElements[index];
                                                newElements[index] = newElements[index + 1];
                                                newElements[index + 1] = temp;
                                                setElements(newElements);
                                            }
                                        }}
                                        className="flex-1 bg-white border border-gray-300 py-1.5 rounded text-xs font-medium hover:bg-gray-50 flex items-center justify-center"
                                    >
                                        Move Forward
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-[10px] text-gray-400 font-mono">
                            <div>
                                X: {Math.round(
                                    selectedId === 'bg-image'
                                        ? bgImage?.x ?? 0
                                        : elements.find(el => el.id === selectedId)?.x ?? 0
                                )}
                            </div>
                            <div>
                                Y: {Math.round(
                                    selectedId === 'bg-image'
                                        ? bgImage?.y ?? 0
                                        : elements.find(el => el.id === selectedId)?.y ?? 0
                                )}
                            </div>
                            <div>
                                W: {Math.round(
                                    selectedId === 'bg-image'
                                        ? (bgImage?.width ?? 0) * (bgImage?.scaleX ?? 1)
                                        : (elements.find(el => el.id === selectedId)?.width ?? 0) * (elements.find(el => el.id === selectedId)?.scaleX ?? 1)
                                )}
                            </div>
                            <div>
                                H: {Math.round(
                                    selectedId === 'bg-image'
                                        ? (bgImage?.height ?? 0) * (bgImage?.scaleY ?? 1)
                                        : (elements.find(el => el.id === selectedId)?.height ?? 0) * (elements.find(el => el.id === selectedId)?.scaleY ?? 1)
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedId && (
                <button
                    onClick={deleteSelected}
                    className="w-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-medium py-2 px-4 rounded transition-colors flex items-center justify-center text-sm mt-2"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                </button>
            )}
        </div>

        <div className="mt-auto flex gap-2">
            {onCancel && (
                <button
                    onClick={onCancel}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                    Cancel
                </button>
            )}
            <button
                onClick={exportAndSave}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
                <Download className="w-4 h-4 mr-2" />
                Export & Save
            </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg border border-dashed border-gray-300 overflow-hidden relative" style={{ minHeight: '500px' }}>
        <div className="shadow-lg bg-white overflow-hidden relative flex items-center justify-center">
            <Stage
                width={canvasSize.width}
                height={canvasSize.height}
                onMouseDown={checkDeselect}
                onTouchStart={checkDeselect}
                ref={stageRef}
                style={{ backgroundColor: '#ffffff' }}
            >
                <Layer>
                    {/* Background Layer */}
                    {bgImage && (
                        <URLImage
                            element={bgImage}
                            isSelected={bgImage.id === selectedId}
                            onSelect={() => selectShape(bgImage.id)}
                            onChange={(newAttrs: any) => setBgImage(newAttrs)}
                        />
                    )}

                    {/* Elements Layer */}
                    {elements.map((el) => {
                        if (el.type === 'IMAGE') {
                            return (
                                <URLImage
                                    key={el.id}
                                    element={el}
                                    isSelected={el.id === selectedId}
                                    onSelect={() => selectShape(el.id)}
                                    onChange={(newAttrs: any) => {
                                        const elIndex = elements.findIndex((e) => e.id === el.id);
                                        const newElements = elements.slice();
                                        newElements[elIndex] = newAttrs;
                                        setElements(newElements);
                                    }}
                                />
                            );
                        } else if (el.type === 'TEXT') {
                            return (
                                <CustomText
                                    key={el.id}
                                    element={el}
                                    isSelected={el.id === selectedId}
                                    onSelect={() => selectShape(el.id)}
                                    onChange={(newAttrs: any) => {
                                        const elIndex = elements.findIndex((e) => e.id === el.id);
                                        const newElements = elements.slice();
                                        newElements[elIndex] = newAttrs;
                                        setElements(newElements);
                                    }}
                                />
                            );
                        }
                        return null;
                    })}
                </Layer>
            </Stage>
        </div>
      </div>
    </div>
  );
};
