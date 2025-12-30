from node import create_trading_node
from instruments.btcusd import btc_usd_cfd

def main():
    node = create_trading_node()

    node.build()

    node.cache.add_instrument(btc_usd_cfd)

    try:
        node.run()
    except KeyboardInterrupt:
        pass
    finally:
        node.stop()
        node.dispose()


if __name__ == "__main__":
    main()
