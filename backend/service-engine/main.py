from node import create_trading_node
from instruments.btcusd import btc_usd_cfd
from strategy.users import StrategyManager
from api import start_server

def main():
    node = create_trading_node()

    node.build()

    node.cache.add_instrument(btc_usd_cfd)

    strategy_manager = StrategyManager(node.trader)
    
    try:
        start_server(strategy_manager)  #change to gRPC
        node.run()
    except KeyboardInterrupt:
        pass
    finally:
        node.stop()
        node.dispose()


if __name__ == "__main__":
    main()
