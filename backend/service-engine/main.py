# main.py
from node import create_trading_node
from venues.prop_venue import create_prop_cfd_venue


def main():
    node = create_trading_node()


    venue = create_prop_cfd_venue()
    node.add_venue(venue)

    # 🔹 Setup runtime (orden recomendado)
    # node.add_venue(...)
    # node.add_instrument(...)
    # node.add_data_client(...)
    # node.add_exec_client(...)
    # node.add_strategy(...)

    node.run()


if __name__ == "__main__":
    main()
