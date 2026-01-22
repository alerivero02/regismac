#!/usr/bin/env python3
"""
Servicio Python para leer datos del ESP32 y exponerlos vía API REST
Puede funcionar como intermediario entre el ESP32 y la aplicación web
"""

from flask import Flask, jsonify
from flask_cors import CORS
import serial
import serial.tools.list_ports
import json
import threading
import time
import os
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Permitir CORS para que la app web pueda acceder

# Estado global del sensor
sensor_state = {
    'temperatura': None,
    'timestamp': None,
    'sensor': 'DS18B20',
    'connected': False,
    'last_update': None,
    'error': None
}

# Lock para acceso thread-safe
state_lock = threading.Lock()

# URL del backend en producción (Render)
# Se puede configurar con variable de entorno BACKEND_URL
# O editar directamente aquí:
BACKEND_URL = os.getenv('BACKEND_URL', 'https://regismac.onrender.com')
SEND_TO_BACKEND = os.getenv('SEND_TO_BACKEND', 'true').lower() == 'true'

# Cargar variables de entorno desde archivo .env si existe
try:
    from dotenv import load_dotenv
    load_dotenv()
    # Recargar después de cargar .env
    BACKEND_URL = os.getenv('BACKEND_URL', BACKEND_URL)
    SEND_TO_BACKEND = os.getenv('SEND_TO_BACKEND', 'true').lower() == 'true'
except ImportError:
    # python-dotenv no está instalado, usar variables de entorno del sistema
    pass

def enviar_a_backend(temperatura, humedad=None):
    """Enviar datos del sensor al backend en producción"""
    if not SEND_TO_BACKEND:
        return
    
    try:
        url = f'{BACKEND_URL}/api/sensor/datos'
        payload = {
            'temperatura': temperatura,
            'humedad': humedad
        }
        
        # Enviar de forma no bloqueante (fire-and-forget)
        response = requests.post(
            url,
            json=payload,
            timeout=2,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
            print(f"[{timestamp}] ✅ Datos enviados al backend: {temperatura}°C")
        else:
            print(f"⚠️  Backend respondió con código {response.status_code}")
            
    except requests.exceptions.Timeout:
        print(f"⚠️  Timeout enviando al backend (no crítico)")
    except requests.exceptions.ConnectionError:
        print(f"⚠️  No se pudo conectar al backend (no crítico)")
    except Exception as e:
        print(f"⚠️  Error enviando al backend: {e} (no crítico)")

def leer_esp32(puerto, baudrate=115200):
    """Lee datos del ESP32 en un hilo separado"""
    global sensor_state
    
    buffer = ""
    ser = None
    
    while True:
        try:
            # Verificar si debemos conectar
            with state_lock:
                should_connect = sensor_state['connected']
            
            if not should_connect:
                if ser:
                    ser.close()
                    ser = None
                time.sleep(1)
                continue
            
            # Conectar si no está conectado
            if ser is None or not ser.is_open:
                try:
                    ser = serial.Serial(puerto, baudrate, timeout=1)
                    print(f"✅ Conectado a {puerto}")
                    with state_lock:
                        sensor_state['error'] = None
                except serial.SerialException as e:
                    print(f"❌ Error conectando a {puerto}: {e}")
                    with state_lock:
                        sensor_state['connected'] = False
                        sensor_state['error'] = str(e)
                    time.sleep(5)
                    continue
            
            # Leer datos mientras esté conectado
            with state_lock:
                is_connected = sensor_state['connected']
            
            while is_connected:
                try:
                    # Verificar conexión periódicamente
                    with state_lock:
                        is_connected = sensor_state['connected']
                    
                    if not is_connected:
                        break
                    
                    if ser.in_waiting > 0:
                        datos_raw = ser.read(ser.in_waiting)
                        datos_texto = datos_raw.decode('utf-8', errors='ignore')
                        print(f"📦 Datos recibidos (raw): {repr(datos_texto)}")
                        buffer += datos_texto
                        
                        # Procesar líneas completas
                        while '\n' in buffer:
                            linea, buffer = buffer.split('\n', 1)
                            linea = linea.strip()
                            
                            if linea:
                                print(f"📥 Línea procesada: {linea}")
                                # Intentar parsear JSON
                                try:
                                    if '{' in linea and '}' in linea:
                                        inicio = linea.find('{')
                                        fin = linea.rfind('}') + 1
                                        json_str = linea[inicio:fin]
                                        
                                        datos = json.loads(json_str)
                                        
                                        # Actualizar estado
                                        temperatura = datos.get('temperatura')
                                        humedad = datos.get('humedad')
                                        
                                        with state_lock:
                                            sensor_state['temperatura'] = temperatura
                                            sensor_state['timestamp'] = datos.get('timestamp')
                                            sensor_state['sensor'] = datos.get('sensor', 'DS18B20')
                                            sensor_state['last_update'] = datetime.now().isoformat()
                                            sensor_state['error'] = None
                                        
                                        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                                        print(f"[{timestamp}] 📊 Temperatura recibida: {temperatura}°C")
                                        
                                        # Enviar al backend en producción (no bloqueante)
                                        if temperatura is not None:
                                            enviar_a_backend(temperatura, humedad)
                                except json.JSONDecodeError:
                                    print(f"⚠️  Error parseando JSON: {linea}")
                    else:
                        time.sleep(0.1)
                        
                except serial.SerialException as e:
                    print(f"❌ Error serial: {e}")
                    with state_lock:
                        sensor_state['connected'] = False
                        sensor_state['error'] = str(e)
                    if ser:
                        ser.close()
                        ser = None
                    break
                except Exception as e:
                    print(f"❌ Error: {e}")
                    time.sleep(1)
            
            if ser and ser.is_open:
                ser.close()
                print(f"🔌 Desconectado de {puerto}")
                ser = None
            
        except Exception as e:
            print(f"❌ Error inesperado: {e}")
            if ser and ser.is_open:
                ser.close()
                ser = None
            time.sleep(5)

@app.route('/api/sensor/estado', methods=['GET'])
def obtener_estado():
    """Obtener estado actual del sensor"""
    with state_lock:
        return jsonify({
            'temperatura': sensor_state['temperatura'],
            'timestamp': sensor_state['timestamp'],
            'sensor': sensor_state['sensor'],
            'connected': sensor_state['connected'],
            'last_update': sensor_state['last_update'],
            'error': sensor_state['error']
        })

@app.route('/api/sensor/conectar', methods=['POST'])
def conectar():
    """Conectar al ESP32"""
    from flask import request
    
    data = request.get_json() or {}
    puerto = data.get('portPath') or 'COM4'  # Puerto por defecto
    baudrate = data.get('baudRate') or 115200
    
    with state_lock:
        if sensor_state['connected']:
            return jsonify({'message': 'Ya está conectado', 'connected': True}), 200
        
        sensor_state['connected'] = True
        sensor_state['error'] = None
    
    # Iniciar hilo de lectura
    thread = threading.Thread(
        target=leer_esp32,
        args=(puerto, baudrate),
        daemon=True
    )
    thread.start()
    
    return jsonify({'message': 'Conectando...', 'connected': True}), 200

@app.route('/api/sensor/desconectar', methods=['POST'])
def desconectar():
    """Desconectar del ESP32"""
    with state_lock:
        sensor_state['connected'] = False
    
    return jsonify({'message': 'Desconectado', 'connected': False}), 200

@app.route('/api/sensor/puertos', methods=['GET'])
def listar_puertos():
    """Listar puertos seriales disponibles"""
    puertos = []
    for puerto in serial.tools.list_ports.comports():
        puertos.append({
            'path': puerto.device,
            'description': puerto.description,
            'hwid': puerto.hwid
        })
    return jsonify({'puertos': puertos})

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    print("=" * 60)
    print("ESP32 Serial Service - API REST")
    print("=" * 60)
    print(f"\n📡 Backend URL: {BACKEND_URL}")
    print(f"📤 Enviar a backend: {SEND_TO_BACKEND}")
    print("\nEndpoints disponibles:")
    print("  GET  /api/sensor/estado     - Estado del sensor")
    print("  POST /api/sensor/conectar   - Conectar al ESP32")
    print("  POST /api/sensor/desconectar - Desconectar")
    print("  GET  /api/sensor/puertos    - Listar puertos")
    print("  GET  /health                - Health check")
    print("\n🚀 Iniciando servidor en http://localhost:5000")
    print("💡 Los datos se enviarán automáticamente al backend en producción")
    
    # Intentar conectar automáticamente si hay un puerto configurado
    auto_port = os.getenv('SERIAL_PORT')
    auto_baud = int(os.getenv('SERIAL_BAUD', '115200'))
    
    if auto_port:
        print(f"\n🔌 Intentando conectar automáticamente a {auto_port}...")
        with state_lock:
            sensor_state['connected'] = True
            sensor_state['error'] = None
        
        thread = threading.Thread(
            target=leer_esp32,
            args=(auto_port, auto_baud),
            daemon=True
        )
        thread.start()
        print(f"✅ Conexión automática iniciada a {auto_port}")
    else:
        print("\n💡 Para conexión automática, configura SERIAL_PORT en variables de entorno")
        print("   Ejemplo: SERIAL_PORT=COM4")
    
    print("")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
