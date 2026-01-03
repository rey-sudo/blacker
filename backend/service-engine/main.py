from node import create_trading_node
from instruments.btcusd import btc_usd_cfd
from strategy.users import StrategyManager
from api import create_app
import uvicorn

def main():
    node = create_trading_node()

    node.build()

    node.cache.add_instrument(btc_usd_cfd)

    strategy_manager = StrategyManager(node.trader)
    
    app = create_app(strategy_manager, node)
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=8011)
    except KeyboardInterrupt:
        pass
    finally:
        node.stop()
        node.dispose()


if __name__ == "__main__":
    main()
