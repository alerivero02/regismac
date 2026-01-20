"""
Servicio Python para manejar comunicación con ESP32
Lee datos del puerto serial y expone una API REST
"""
import serial
import json
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from threading import Thread, Lock
import logging

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Permitir CORS para el frontend

# Estado del sensor (thread-safe)
sensor_state = {
    'temperatura': None,
    'humedad': None,
    'timestamp': None,
    'test_activo': False,
    'temperatura_inicial': None,
    'tiempo_inicio': None,
    'tiempo_0_grados': None,
    'tiempo_menos8_grados': None,
    'connected': False,
    'port': None
}

state_lock = Lock()

# Configuración serial
SERIAL_PORT = None
SERIAL_BAUD = 115200
serial_connection = None
reading_thread = None

def update_sensor_state(data):
    """Actualizar estado del sensor de forma thread-safe"""
    global sensor_state
    
    with state_lock:
        if 'error' in data:
            logger.error(f"Error en datos: {data['error']}")
            return
        
        if 'temperatura' in data and data['temperatura'] is not None:
            sensor_state['temperatura'] = float(data['temperatura'])
            sensor_state['timestamp'] = time.time()
            
            # Si hay test activo, detectar temperaturas objetivo
            if sensor_state['test_activo'] and sensor_state['tiempo_inicio']:
                tiempo_transcurrido = int(time.time() - sensor_state['tiempo_inicio'])
                
                # Detectar 0°C (tolerancia ±0.5°C)
                if (sensor_state['tiempo_0_grados'] is None and 
                    -0.5 <= sensor_state['temperatura'] <= 0.5):
                    sensor_state['tiempo_0_grados'] = tiempo_transcurrido
                    logger.info(f"✅ Temperatura 0°C detectada en {tiempo_transcurrido} segundos")
                
                # Detectar -8°C (tolerancia ±0.5°C)
                if (sensor_state['tiempo_menos8_grados'] is None and 
                    -8.5 <= sensor_state['temperatura'] <= -7.5):
                    sensor_state['tiempo_menos8_grados'] = tiempo_transcurrido
                    logger.info(f"✅ Temperatura -8°C detectada en {tiempo_transcurrido} segundos")
        
        if 'humedad' in data and data['humedad'] is not None:
            sensor_state['humedad'] = float(data['humedad'])

def read_serial_data():
    """Leer datos del puerto serial en un thread separado"""
    global serial_connection, sensor_state
    
    buffer = ""
    
    while sensor_state['connected']:
        try:
            if serial_connection and serial_connection.is_open:
                # Leer datos disponibles
                if serial_connection.in_waiting > 0:
                    data = serial_connection.read(serial_connection.in_waiting).decode('utf-8', errors='ignore')
                    buffer += data
                    
                    # Procesar líneas completas
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        
                        if not line:
                            continue
                        
                        logger.debug(f"Línea recibida: {line}")
                        
                        # Intentar parsear como JSON
                        try:
                            if line.startswith('{') and line.endswith('}'):
                                data = json.loads(line)
                                update_sensor_state(data)
                            else:
                                # Intentar extraer JSON de la línea
                                json_match = None
                                if '{' in line and '}' in line:
                                    start = line.find('{')
                                    end = line.rfind('}') + 1
                                    json_match = line[start:end]
                                
                                if json_match:
                                    data = json.loads(json_match)
                                    update_sensor_state(data)
                                elif 'temperatura' in line.lower() or 'temp' in line.lower():
                                    # Intentar extraer temperatura manualmente
                                    import re
                                    temp_match = re.search(r'"temperatura"\s*:\s*([\d.-]+)', line)
                                    if not temp_match:
                                        temp_match = re.search(r'T[=:]\s*([\d.-]+)', line)
                                    if temp_match:
                                        temp = float(temp_match.group(1))
                                        update_sensor_state({'temperatura': temp})
                        except json.JSONDecodeError as e:
                            logger.warn(f"No se pudo parsear JSON: {line[:50]}... Error: {e}")
                        except Exception as e:
                            logger.error(f"Error procesando línea: {e}")
                
                time.sleep(0.1)  # Pequeña pausa para no saturar CPU
            else:
                time.sleep(1)
        except Exception as e:
            logger.error(f"Error leyendo datos seriales: {e}")
            time.sleep(1)

def connect_serial(port_path=None, baud_rate=115200):
    """Conectar al puerto serial"""
    global serial_connection, sensor_state, reading_thread, SERIAL_PORT, SERIAL_BAUD
    
    try:
        # Cerrar conexión existente si hay
        disconnect_serial()
        
        if port_path:
            SERIAL_PORT = port_path
        SERIAL_BAUD = baud_rate
        
        serial_connection = serial.Serial(
            port=SERIAL_PORT,
            baudrate=SERIAL_BAUD,
            timeout=1,
            write_timeout=1
        )
        
        with state_lock:
            sensor_state['connected'] = True
            sensor_state['port'] = SERIAL_PORT
        
        # Iniciar thread de lectura
        reading_thread = Thread(target=read_serial_data, daemon=True)
        reading_thread.start()
        
        logger.info(f"✅ Conectado al puerto serial: {SERIAL_PORT} ({SERIAL_BAUD} baud)")
        return True
    except Exception as e:
        logger.error(f"Error conectando al puerto serial: {e}")
        with state_lock:
            sensor_state['connected'] = False
        return False

def disconnect_serial():
    """Desconectar del puerto serial"""
    global serial_connection, sensor_state, reading_thread
    
    with state_lock:
        sensor_state['connected'] = False
    
    if serial_connection and serial_connection.is_open:
        serial_connection.close()
    
    if reading_thread and reading_thread.is_alive():
        # El thread se detendrá automáticamente cuando connected sea False
        pass
    
    logger.info("Desconectado del puerto serial")

# API Endpoints

@app.route('/api/status', methods=['GET'])
def get_status():
    """Obtener estado del sensor"""
    with state_lock:
        return jsonify({
            'temperatura': sensor_state['temperatura'],
            'humedad': sensor_state['humedad'],
            'timestamp': sensor_state['timestamp'],
            'test_activo': sensor_state['test_activo'],
            'temperatura_inicial': sensor_state['temperatura_inicial'],
            'tiempo_inicio': sensor_state['tiempo_inicio'],
            'tiempo_transcurrido': int(time.time() - sensor_state['tiempo_inicio']) if sensor_state['tiempo_inicio'] else 0,
            'tiempo_0_grados': sensor_state['tiempo_0_grados'],
            'tiempo_menos8_grados': sensor_state['tiempo_menos8_grados'],
            'connected': sensor_state['connected'],
            'port': sensor_state['port']
        })

@app.route('/api/start-test', methods=['POST'])
def start_test():
    """Iniciar un test"""
    global sensor_state
    
    data = request.get_json() or {}
    temperatura_inicial = data.get('temperatura_inicial')
    
    if temperatura_inicial is None:
        temperatura_inicial = sensor_state['temperatura']
    
    if temperatura_inicial is None:
        return jsonify({'error': 'No hay temperatura disponible'}), 400
    
    with state_lock:
        sensor_state['test_activo'] = True
        sensor_state['temperatura_inicial'] = float(temperatura_inicial)
        sensor_state['tiempo_inicio'] = time.time()
        sensor_state['tiempo_0_grados'] = None
        sensor_state['tiempo_menos8_grados'] = None
    
    logger.info(f"Test iniciado con temperatura inicial: {temperatura_inicial}°C")
    return jsonify({'success': True, 'temperatura_inicial': temperatura_inicial})

@app.route('/api/end-test', methods=['POST'])
def end_test():
    """Finalizar un test"""
    global sensor_state
    
    with state_lock:
        resultado = {
            'temperatura_inicial': sensor_state['temperatura_inicial'],
            'tiempo_0_grados': sensor_state['tiempo_0_grados'],
            'tiempo_menos8_grados': sensor_state['tiempo_menos8_grados'],
            'humedad': sensor_state['humedad']
        }
        
        sensor_state['test_activo'] = False
        sensor_state['temperatura_inicial'] = None
        sensor_state['tiempo_inicio'] = None
        sensor_state['tiempo_0_grados'] = None
        sensor_state['tiempo_menos8_grados'] = None
    
    logger.info("Test finalizado")
    return jsonify({'success': True, 'resultado': resultado})

@app.route('/api/cancel-test', methods=['POST'])
def cancel_test():
    """Cancelar un test"""
    global sensor_state
    
    with state_lock:
        sensor_state['test_activo'] = False
        sensor_state['temperatura_inicial'] = None
        sensor_state['tiempo_inicio'] = None
        sensor_state['tiempo_0_grados'] = None
        sensor_state['tiempo_menos8_grados'] = None
    
    logger.info("Test cancelado")
    return jsonify({'success': True})

@app.route('/api/connect', methods=['POST'])
def connect():
    """Conectar al puerto serial"""
    data = request.get_json() or {}
    port_path = data.get('port_path')
    baud_rate = data.get('baud_rate', 115200)
    
    if connect_serial(port_path, baud_rate):
        return jsonify({'success': True, 'port': SERIAL_PORT})
    else:
        return jsonify({'error': 'No se pudo conectar al puerto'}), 500

@app.route('/api/disconnect', methods=['POST'])
def disconnect():
    """Desconectar del puerto serial"""
    disconnect_serial()
    return jsonify({'success': True})

@app.route('/api/ports', methods=['GET'])
def list_ports():
    """Listar puertos seriales disponibles"""
    try:
        import serial.tools.list_ports
        ports = serial.tools.list_ports.comports()
        return jsonify({
            'success': True,
            'ports': [{'path': p.device, 'description': p.description} for p in ports]
        })
    except Exception as e:
        logger.error(f"Error listando puertos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Intentar conectar automáticamente si hay un puerto configurado
    import os
    auto_port = os.getenv('SERIAL_PORT')
    if auto_port:
        connect_serial(auto_port)
    
    # Iniciar servidor Flask
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
