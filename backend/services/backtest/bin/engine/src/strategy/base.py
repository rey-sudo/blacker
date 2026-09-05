from abc import ABC

class Strategy(ABC):
    def __init__(self, kind: str, params: dict):
            self.kind = kind
            self.params = params 

    def evaluate(self, state):
        raise NotImplementedError