#!/usr/bin/env python3
"""
Script para probar la conexión serial con el ESP32
Lee datos del puerto serial y muestra los datos recibidos
"""

import serial
import serial.tools.list_ports
import json
import time
import sys

def listar_puertos():
    """Lista todos los puertos seriales disponibles"""
    print("\n=== Puertos Seriales Disponibles ===\n")
    puertos = serial.tools.list_ports.comports()
    
    if not puertos:
        print("❌ No se encontraron puertos seriales")
        return []
    
    for i, puerto in enumerate(puertos, 1):
        print(f"{i}. {puerto.device}")
        print(f"   Descripción: {puerto.description}")
        print(f"   Hardware ID: {puerto.hwid}")
        print()
    
    return puertos

def leer_esp32(puerto, baudrate=115200, timeout=1):
    """Lee datos del ESP32 por puerto serial"""
    try:
        print(f"\n🔌 Conectando a {puerto} a {baudrate} baudios...")
        ser = serial.Serial(puerto, baudrate, timeout=timeout)
        print(f"✅ Conectado exitosamente\n")
        print("📡 Esperando datos del ESP32...")
        print("   (Presiona Ctrl+C para detener)")
        print("   El ESP32 debería enviar datos cada 0.5-1 segundo")
        print("   Si no ves datos JSON, verifica:")
        print("     1. Que el sensor DS18B20 esté conectado correctamente")
        print("     2. Que el código esté cargado en el ESP32")
        print("     3. Que el sensor esté funcionando\n")
        print("-" * 60)
        
        buffer = ""
        contador = 0
        
        while True:
            try:
                # Leer datos disponibles
                if ser.in_waiting > 0:
                    # Leer bytes y decodificar
                    datos_raw = ser.read(ser.in_waiting)
                    datos_texto = datos_raw.decode('utf-8', errors='ignore')
                    
                    # Agregar al buffer
                    buffer += datos_texto
                    
                    # Procesar líneas completas
                    while '\n' in buffer:
                        linea, buffer = buffer.split('\n', 1)
                        linea = linea.strip()
                        
                        if linea:
                            contador += 1
                            print(f"\n[{contador}] Línea recibida: {linea}")
                            
                            # Intentar parsear como JSON
                            try:
                                # Buscar JSON en la línea
                                if '{' in linea and '}' in linea:
                                    inicio = linea.find('{')
                                    fin = linea.rfind('}') + 1
                                    json_str = linea[inicio:fin]
                                    
                                    datos = json.loads(json_str)
                                    print(f"   ✅ JSON parseado correctamente:")
                                    print(f"      Temperatura: {datos.get('temperatura', 'N/A')}°C")
                                    print(f"      Timestamp: {datos.get('timestamp', 'N/A')}")
                                    print(f"      Sensor: {datos.get('sensor', 'N/A')}")
                                else:
                                    # Mostrar solo si no es un mensaje de boot conocido
                                    if not any(x in linea.lower() for x in ['ets', 'rst:', 'boot:', 'configsip', 'load:', 'entry', 'esp32', 'sensor', 'sistema']):
                                        print(f"   ⚠️  No se encontró JSON en la línea")
                                    else:
                                        # Mensajes de boot, solo mostrar el primero
                                        if contador <= 15:
                                            print(f"   ℹ️  Mensaje de boot del ESP32 (normal)")
                            except json.JSONDecodeError as e:
                                print(f"   ❌ Error parseando JSON: {e}")
                                print(f"   📝 Contenido: {linea}")
                else:
                    # Si no hay datos, esperar un poco
                    time.sleep(0.1)
                    
            except KeyboardInterrupt:
                print("\n\n⏹️  Deteniendo lectura...")
                break
            except Exception as e:
                print(f"\n❌ Error leyendo datos: {e}")
                break
        
        ser.close()
        print(f"\n✅ Desconectado. Total de líneas procesadas: {contador}")
        
    except serial.SerialException as e:
        print(f"\n❌ Error de conexión serial: {e}")
        print("\nPosibles causas:")
        print("  - El puerto está en uso por otra aplicación")
        print("  - El puerto no existe")
        print("  - Permisos insuficientes")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        sys.exit(1)

def main():
    print("=" * 60)
    print("ESP32 Serial Reader - Test de Conexión")
    print("=" * 60)
    
    # Listar puertos disponibles
    puertos = listar_puertos()
    
    if not puertos:
        print("\n❌ No hay puertos disponibles. Verifica que el ESP32 esté conectado.")
        sys.exit(1)
    
    # Si se pasa el puerto como argumento, usarlo directamente
    if len(sys.argv) > 1:
        puerto_seleccionado = sys.argv[1]
    else:
        # Usar el primer puerto disponible automáticamente
        if puertos:
            puerto_seleccionado = puertos[0].device
            print(f"\n✅ Usando puerto automático: {puerto_seleccionado}")
        else:
            print("\n❌ No hay puertos disponibles")
            sys.exit(1)
    
    # Leer datos del ESP32
    leer_esp32(puerto_seleccionado)

if __name__ == "__main__":
    main()
