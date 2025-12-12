import pymysql
from pymysql.err import MySQLError


def create_orders_log_table(conn):
    """Crea la tabla orders_log si no existe."""
    try:
        cursor = conn.cursor()
        sql = """
CREATE TABLE IF NOT EXISTS orders_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL UNIQUE,
    processed_at DATETIME NOT NULL,
    INDEX(order_id)
)
        """
        cursor.execute(sql)
        conn.commit()

    except MySQLError as e:
        print("Error creando tabla orders_log:", e)

    finally:
        cursor.close()


def process_orders():
    conn = None
    cursor = None

    try:
        # ===========================================
        # Conexión PyMySQL
        # ===========================================
        conn = pymysql.connect(
            host='localhost',
            user='blacker',
            password='password',
            database='service_slave',
            autocommit=False,        # importantísimo para transacciones
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor
        )

        cursor = conn.cursor()

        # ===========================================
        # 0) Crear tabla si no existe
        # ===========================================
        create_orders_log_table(conn)

        # ===========================================
        # 1) Buscar y bloquear órdenes
        # ===========================================
        conn.begin()

        select_query = """
            SELECT id, status
            FROM orders
            WHERE status = 'created'
            AND id NOT IN (SELECT order_id FROM orders_log)
            FOR UPDATE SKIP LOCKED
        """
        cursor.execute(select_query)
        orders = cursor.fetchall()

        conn.commit()  # liberar bloqueo

        print(f"Órdenes bloqueadas para procesamiento: {len(orders)}")

        # ===========================================
        # 2) Procesar cada orden individualmente
        # ===========================================
        for order in orders:
            print(f"Procesando orden {order['id']}...")

            try:
                conn.begin()

                # Cambiar estado
                update_query = """
                    UPDATE orders
                    SET status = 'executed'
                    WHERE id = %s
                """
                cursor.execute(update_query, (order['id'],))

                # Insertar log
                log_query = """
                    INSERT INTO orders_log (order_id, processed_at)
                    VALUES (%s, NOW())
                """
                cursor.execute(log_query, (order['id'],))

                conn.commit()

                print(f"Orden {order['id']} ejecutada y logueada.")

            except MySQLError as e:
                conn.rollback()
                print(f"Error procesando orden {order['id']}: {e}")

    except MySQLError as e:
        print("Error conectando a la base de datos:", e)

    finally:
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
                print("Conexión MySQL cerrada.")
        except:
            pass





    """
    resp = abrir_orden_market(
        symbol="BTCUSD",
        volumen=0.01,
        sl=93000.932238,
        tp=95000.3238237,
        tipo="BUY"
    )

    print(resp)
    """